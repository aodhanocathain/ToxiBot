const remarks =
[
	"who asked","any askers?","L + Ratio","don't care","skill issue","cringe","didn't ask",
	"<:pringlespov:942975168391839774>","<:swonkitywhat:864540504079204352>",
	"https://tenor.com/view/ip-ip-address-address-mc-mcdonalds-gif-22850447",
	"https://media.discordapp.net/attachments/796506892695765002/798989348112433152/image0-2.gif",
	"https://tenor.com/view/jarvis-iron-man-who-asked-who-asked-meme-meme-gif-24590276",
	"https://tenor.com/view/btd6-bloons-monkey-buccaneer-who-tf-asked-tf-asked-gif-19748875",
	"https://tenor.com/view/mario-please-stfu-shut-the-fuck-up-clouds-gif-17293612"
]

const oneIn = 15;	//probability of sending a message = 1/(oneIn)

module.exports =
{
	want: function()
	{
		return (Math.random()*remarks.length*oneIn < remarks.length);
	},
	
	make: function(channel)
	{
		let index = Math.floor(Math.random()*remarks.length);
		channel.send(remarks[index]);
	}
}