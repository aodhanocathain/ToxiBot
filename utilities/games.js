/*
This module manages interaction with the chess program and management of individual games.
The communications are explained in the protocol text file.
*/

const pics = require("../resources/pics.js");
const {execFile} = require("child_process");
const {inspect} = require("util");

let bot;

module.exports =
{
	init: function(trackbot)
	{
		bot = trackbot;
		bot.games = {};
	},
	
	get: function(username)
	{
		if(!bot.games[username]){throw `${username} has no game`;}
		return bot.games[username];
	},
	
	create: function(message)
	{
		const username = message.author.username;
		
		try
		{
			this.stop(username);	//terminate any already running process of a previous game with the same user
		}catch(err){console.log(err);}
		
		const choices = message.content.split(" ");
		
		const pieces = (choices[choices.length-2]=="random"? ["white", "black"][Math.floor(Math.random()*2)] : choices[choices.length-1]);
		const ailvl = choices[choices.length-1];
		
		const gameproc = execFile("./Chess/main");
		bot.games[username] = {data:null, player:pieces, difficulty:ailvl, perspective:pieces, proc: gameproc};
		if(bot.games[username].player=="black"){this.progress(message);}
		//this.progress(username);
		gameproc.stdout.on('data',
		(data)=>
		{
			console.log(`GAMES.CREATE | Output received from chess program:\n\t${data}`);
			const parts = data.split(" ");
			switch(parts[0])
			{	
				case "GAME":
				bot.games[username].data = parts[1];
				const representation = this.represent(username);
				message.channel.send(representation);
				break;
			
				case "RESULT":
				this.stop(username);
				case "ADVICE":
				case "ERROR":
				message.reply(`response from chess program: ${parts.slice(1).join(" ")}`);
				break;
				
				case "UPDATE":
				message.channel.send(`${parts.slice(1).join(" ")}`);
				break;
				
				default:
				break;
			}
		});
		gameproc.on("exit",(code, signal)=>{console.log(`process exited with code ${code} and signal ${signal}`);})
	},
	
	represent: function(username)	//turn the chess program's output of the board into an emote format ready to be sent on Discord
	{
		const game = this.get(username);
		function index(file, rank){return (8*(7-rank)) + file;};	//index in the board string corresponding to a given square
		function decode(piece){return piece-("a".charCodeAt(0));};
		
		let representation = ``;
		//change the order in which the board is drawn depending on the player perspective
		
		const bigtosmall = [7, -1, -1];
		const smalltobig = [0, +1, 8];
		const [rank, rankinc, ranklimit] = (game["perspective"]=="white"? bigtosmall : smalltobig);
		const [file, fileinc, filelimit] = (game["perspective"]=="white"? smalltobig : bigtosmall);
		
		let f = file, r = rank;
		while(r!=ranklimit)	//represent a rank in each loop iteration
		{
			let f = file;
			while(f!=filelimit)	//represent a square in each loop iteration
			{
				//use emotes with the right colour background that matches the square being represented
				const colourimgs = ((f+r)%2)==0? pics.dark : pics.light;	//indices for dark squares have an even sum
			
				//find the square's index in the board string, read that piece encoding (a single character), decode it and append it to the translation
				representation = `${representation}${colourimgs[decode(game.data.charCodeAt(index(f, r)))]}`;
				f = f + fileinc;
			}
			//annotate the rank name at the side
			representation = `${representation}\t**${(+'1')+r}**\n`;
			r = r + rankinc;
		}
		//annotate the files at the bottom
		if(game["perspective"]=="white"){representation = `${representation}**  a    b    c     d    e     f    g    h **`;}
		else{representation = `${representation}**  h    g    f     e    d     c    b    a **`;}
		return representation;
	},
	
	flip: function(username)
	{
		const game = this.get(username);
		game.perspective = (game.perspective=="white")? "black" : "white";
	},
	
	stop: function(username)
	{
		const game = this.get(username);
				
		if(game.proc)
		{
			game.proc.kill();
			game.proc = null;
			console.log(`Killed ${username}'s game process`);
		}
		else
		{
			throw `GAMES.STOP | ${username} has no game process to stop`;
		}
	},
	
	input: function(username, string)
	{
		const game = this.get(username);
		if(game.proc)
		{
			game.proc.stdin.write(`${string}\n`);
			console.log(`GAMES.INPUT | Input given to chess program: ${string}`);
		}
		else
		{
			throw `GAMES.INPUT | ${username} has no game process to give input to`;
		}
	},
	
	progress: function(message)
	{
		message.channel.send("Toxibot's turn...");
		const username = message.author.username;
		const game = this.get(username);
		this.input(username, `${game.difficulty=="easy"? "RANDOM" : "BEST"} lol`); 
	},
	
	playturn: function(message, string)
	{
		const username = message.author.username;
		const game = this.get(username);
		this.input(username, string);
		this.progress(message);
	}
}