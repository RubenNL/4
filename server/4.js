var wss=require('ws')
var ws=new wss.Server({port:3004})
var listening=true
ws.on('close',function () {
	listening=false
})
exports.listening=function () {
	return listening
}
exports.stop=function () {
	ws.close()
}
var kickInterval=null
var games={}
function startInterval() {
	if(kickInterval) return
		console.log('starting interval')
		kickInterval=setInterval(function () {
			ws.clients.forEach(function(ws) {
				if(!ws.isAlive) {
					console.log('terminated connection')
					return ws.terminate();
				}
				ws.isAlive=false
				ws.ping(function () {})
			})
			if(ws.clients.size==0) {
				clearInterval(kickInterval)
				kickInterval=null
			}
			console.log('sending pings')
		},15*1000)
}
ws.on('connection', function (connection,request) {
	if(ws.clients.size==1) startInterval()
	var gameId=request.url.split('/')[1]
	if(!games[gameId]) games[gameId]=createGame(gameId)
	game=games[gameId]
	game.clients.push(connection)
	if(!game.started) {
		game.aantalSpelers++
		connection.playerId=game.aantalSpelers
		if(game.aantalSpelers==1) game.started=true
	} else {
		connection.playerId=999
		connection.send(JSON.stringify(getSpelerInfo(connection.playerId)))
	}
	connection.gameId=gameId
	connection.isAlive=true
	connection.on('pong',function () {this.isAlive=true; console.log('pong received!')})
	connection.on('message',function (message) {
		game=games[gameId]
		game.deleteTimeout=removeTimeout(gameId)
		data=JSON.parse(message)
		if(receiveFromSpeler(connection,data.actie,data.data)) games[gameId]=undefined
		else games[gameId]=game
	})
	sendToPlayers()
})
function removeGame(gameId) {
	game=games[gameId]
	endWithMessage('2 uur verstreken, game wordt gewist.')
	games[gameId]=undefined
}
function removeTimeout(gameId,first) {
	if(!first) clearTimeout(games[gameId].deleteTimeout)
		return setTimeout(function() {games[gameId]=undefined},2*60*60*1000)
		//todo
		//return setTimeout(function() {removeGame(gameId)},30000)
}
function newGrid() {
	grid=JSON.parse(JSON.stringify(new Array(7).fill(new Array(6).fill(-1))))
	return grid
}
function createGame(gameId) {
	return {
		difficulty:50,
		gameId:gameId,
		bots:[],
		started:false,
		grid:newGrid(),
		beurt:0,
		aantalSpelers:-1,
		clients:[],
		deleteTimeout:removeTimeout(gameId,true)
	}
}
function getSpelerInfo(spelerId) {
	if(game.started) {
		return {
			started:game.started,
			grid:game.grid,
			beurt:game.beurt,
			spelerId:spelerId,
			spelerAantal: game.aantalSpelers
		}
	}else {
		return {
			started: game.started,
			spelerId:spelerId,
			spelerAantal:game.aantalSpelers+1
		}
	}
}
function sendToPlayers() {
	console.log('sendtoplayers!')
	game.clients.forEach(function (client) {
		client.send(JSON.stringify(getSpelerInfo(client.playerId)))
	})
	console.log(game.bots)
	if(game.bots.indexOf(game.beurt)>-1) {
		bot(game.difficulty,JSON.parse(JSON.stringify(getSpelerInfo(game.beurt))),function (actie,data) {
			receiveFromSpeler({playerId:game.beurt},actie,data)
		})
	}
}
function endWithMessage(message) {
	game.clients.forEach(function (client) {
		client.close(4321,message)
	})
	games[game.gameId]=undefined
}
function receiveFromSpeler(connection,actie,arguments) {
	spelerId=connection.playerId
	if(actie=="start" && !game.started) {
		/*if(game.aantalSpelers==0) {
			game.aantalSpelers++
			game.bots.push(game.aantalSpelers)
		}*/
		game.beurt=0
		game.started=true
		sendToPlayers()
		return
	} else if(actie=="stop" && game.started) {
		if(spelerId>game.aantalSpelers) connection.close(4321,'geen speler.')
		else {
			sendToPlayers("game gestopt door speler "+spelerId+".")
			return true
		}
	} else if(spelerId==game.beurt) {
		if(actie=="difficulty") {
			game.difficulty=parseInt(arguments)
		} else if(actie=="drop") {
			grid=game.grid.map(function (row) {return row.filter(function (cell) {return cell>-1})})
			x=parseInt(arguments.x)
			if(grid[x] && grid[x].length==6) {
				console.log('al geplaatst')
				sendToPlayers()
				return
			}
			grid[x].unshift(spelerId)
			game.grid=grid.map(function (row) {
				while(row.length!==6) {row.unshift(-1)}
				return row
			})
			console.log('grid:',game.grid)
			gewonnen=-1
			game.grid.forEach(function (row,rowId) {
				row.forEach(function (cell,cellId) {
					if(cell==-1) return
					if(cell==row[cellId+1] && cell==row[cellId+2] && cell==row[cellId+3]) gewonnen=cell
					if(!game.grid[rowId+3]) return
					if(cell==game.grid[rowId+1][cellId] && cell==game.grid[rowId+2][cellId] && cell==game.grid[rowId+3][cellId]) gewonnen=cell
				})
			})
			if(gewonnen>-1) {
				sendToPlayers();
				endWithMessage("gewonnen door speler "+gewonnen+".")
				return true
			}
			game.beurt++
			if(game.beurt>game.aantalSpelers) game.beurt=0
		}
		sendToPlayers();
		if(game.grid.filter(function (row,rowId) {
			return row.filter(function (cell) {return cell>-1}).length==6
		}).length==7) {
			endWithMessage('spel is geeindigd');
			return true
		}
	} else {
		console.log('beurt:',game.beurt,'speler:',spelerId)
		console.log("niet aan de beurt")
	}
}
console.log('started!')
