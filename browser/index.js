$('#status').text('verbinding maken...')
var Util={};
Util.base64 = function(mimeType, base64) {
	return 'data:' + mimeType + ';base64,' + base64;
};
var video = document.createElement('video');
video.setAttribute('loop', '');
function addSourceToVideo(element, type, dataURI) {
	var source = document.createElement('source');
	source.src = dataURI;
	source.type = 'video/' + type;
	element.appendChild(source);
}
addSourceToVideo(video,'webm', Util.base64('video/webm', 'GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA='));
addSourceToVideo(video, 'mp4', Util.base64('video/mp4', 'AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAG21kYXQAAAGzABAHAAABthADAowdbb9/AAAC6W1vb3YAAABsbXZoZAAAAAB8JbCAfCWwgAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAIVdHJhawAAAFx0a2hkAAAAD3wlsIB8JbCAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAIAAAACAAAAAABsW1kaWEAAAAgbWRoZAAAAAB8JbCAfCWwgAAAA+gAAAAAVcQAAAAAAC1oZGxyAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAAVxtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAEcc3RibAAAALhzdHNkAAAAAAAAAAEAAACobXA0dgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAIAAgASAAAAEgAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAAFJlc2RzAAAAAANEAAEABDwgEQAAAAADDUAAAAAABS0AAAGwAQAAAbWJEwAAAQAAAAEgAMSNiB9FAEQBFGMAAAGyTGF2YzUyLjg3LjQGAQIAAAAYc3R0cwAAAAAAAAABAAAAAQAAAAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAFHN0c3oAAAAAAAAAEwAAAAEAAAAUc3RjbwAAAAAAAAABAAAALAAAAGB1ZHRhAAAAWG1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAAK2lsc3QAAAAjqXRvbwAAABtkYXRhAAAAAQAAAABMYXZmNTIuNzguMw=='));
iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
$('.button').on('click',function () {
	if(!iOS) video.play()
})
table=''
for(y=0;y<6;y++) {
	table+='<tr class="actionrow">'
	for(x=0;x<7;x++) {
		table+='<td class="actioncell"><button class="action" x="'+x+'" y="'+y+'"></button></td>'
	}
	table+='</tr>'
}
$('#main').append(table)
$('button.action').on('click',function () {
	button=$(this)
	x=button.attr('x')
	y=button.attr('y')
	console.log(x,y)
	sendToServer('drop',{x:x,y:y})
})
$('#status').on('click',function () {
	if(!started) sendToServer('start',{'start':'start'})
	else if(confirm("wil je het spel stoppen?")) sendToServer("stop",{'stop':'stop'})
})
var beurt
var playerId=-1
var ws={send:function (text) {}}
var started=false
function beurtEnd() {
	$('.action').attr('disabled',true)
}
function beurtStart() {
	$('.action').attr('disabled',false)
}
function changeText(elements,newtext) {
	//if(newtext==null) newtext=""
	newtext=""+newtext
	elements.each(function () {
		var element=$(this)
		if(element.attr('player')!==newtext) {
			element.css('font-weight',900)
			element.attr('player',newtext)
			setTimeout(function () {
				element.css('font-weight','')
			},500)
		}
	})
}
function gameUpdate(info) {
	spelerAantal=info.spelerAantal
	started=info.started
	if(!started) {
		$('#status').text('start('+spelerAantal+')')
		return
	}
	$('#status').text('stoppen')
	playerId=info.spelerId
	aantalPerSpeler=[0,0,0,0]
	info.grid.forEach(function(row,x) {
		row.forEach(function(cell,y) {
			cell=parseInt(cell)
			if(cell>-1) {
				aantalPerSpeler[cell]++
			}
			changeText($('.action[x="'+x+'"][y="'+y+'"]'),cell)
		})
	})
	if(info.beurt==playerId) $('.action').attr('disabled',false)
	else $('.action').attr('disabled',true)
}
function connect() {
	$('#difficulty').on('click',function () {
		sendToServer('difficulty',prompt('',50))
	})
	hash=window.location.hash.split('#')[1]
	if(!hash) hash=prompt('code?',Math.random().toString(36).substring(7))
	if(!hash) return
	window.location.hash='#'+hash
	ws = new WebSocket('wss://'+window.location.host+'/4socket/'+window.location.hash.split('#')[1])
	ws.onmessage=function (event) {
		data=JSON.parse(event.data)
		gameUpdate(data)
	}
	ws.onclose=function (info) {
		if(info.code==4321) alert(info.reason)
		else alert('verbinding verbroken.')
		$('button:empty()').text('verbinding verbroken')
	}
	ws.onopen=function () {
		$('#status').attr('disabled',false).text('start')
	}
}
var waitForJQuery = setInterval(function () {
	if (typeof $ != 'undefined') {
		connect()
		clearInterval(waitForJQuery);
	}
}, 10);
function sendToServer(actie,data) {
	console.log(actie,JSON.stringify(data))
	ws.send(JSON.stringify({actie:actie,data:data}))
}
