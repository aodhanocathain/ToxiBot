/*
This module manages interaction with the chess program and management of individual games.
The communications are explained in the protocol text file.
*/

const pics = require("../resources/pics.js");
const {exec} = require("child_process");

let bot;

module.exports =
{
	init: function(trackbot)
	{
		bot = trackbot;
		bot.games = {};
	},
	
	has: function(username)
	{
		if(bot.games[username]){return true;}
		else{return false;}
	},
	
	create: function(username)
	{
		if(bot.games[username]){this.stop(username);}	//terminate any already running process of a previous game with the same user
		const game = exec("./Chess/main");
		bot.games[username] = {data:null, perspective:"white", proc: game};
		game.stdout.on('data',
		(data)=>
		{
			const parts = data.split(" ");
			switch(parts[0])
			{
				case "GAME":
				bot.games[username].data = parts[1];
				break;
				
				case "RESULT":
				this.stop(username);
				break;
			}
		});
	},
	
	represent: function(username)	//turn the chess program's output of the board into an emote format ready to be sent on Discord
	{
		function index(file, rank){	return (8*(7-rank)) + file;};	//index in the board string corresponding to a given square
		function decode(piece){return piece-("a".charCodeAt(0));};
		
		let translation = ``;
		const game = bot.games[username];
		
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
				translation = `${translation}${colourimgs[decode(game.data.charCodeAt(index(f, r)))]}`;
				f = f + fileinc;
			}
			//annotate the rank name at the side
			translation = `${translation}\t**${(+'1')+r}**\n`;
			r = r + rankinc;
		}
		//annotate the files at the bottom
		if(game["perspective"]=="white"){translation = `${translation}**  a    b    c     d    e     f    g    h **`;}
		else{translation = `${translation}**  h    g    f     e    d     c    b    a **`;}
		return translation;
	},
	
	flip: function(username)
	{
		let persp = bot.games[username].perspective;
		if(persp=="white"){bot.games[username].perspective = "black";}
		else{bot.games[username].perspective = "white";}
	},
	
	stop: function(username)
	{
		bot.games[username].proc.kill("SIGTERM");
	},
}