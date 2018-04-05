// Load up the discord.js library
const Discord = require("discord.js");
const bot = new Discord.Client();
const Gfycat = require('gfycat-sdk');
const assert = require('assert');
const fs = require('fs');


const auth = require("./auth.json");
// auth.token contains the discord bot's token

const config = require("./config.json");
// config.prefix contains the message prefix.

var filename = "./gifs.json";
const gifsFile = require(filename);


//Gyfcat authentication
var gfycat = new Gfycat({clientId: auth.gyfcat_id, clientSecret: auth.gyfcat_secret});
authenicateGyfcat();

//On bot launch
bot.on("ready", () => {
  console.log(`Bot is up and running started, in ${bot.guilds.size} servers:`);
  for(var [key, value] of bot.guilds){
    console.log('\t' + value.name);
  }
  bot.user.setActivity(`games with your heart.`);
});

//When bot joins a server
bot.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`Bot has been added to server: ${guild.name} (id: ${guild.id})`);
});

bot.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});


bot.on("message", async message => {
  //Ignore other bots
  if(message.author.bot) return;

  //Ensure prefix is used in message
  if(message.content.indexOf(config.prefix) !== 0) return;

  //TODO add and remove channel

  //Check that channel is correct
  if(config.channels.indexOf(message.channel.id)==-1) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();


  if(command === "ping") {
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(bot.ping)}ms`);
  }
  if(command === "random") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(bot.ping)}ms`);
  }
  if(command === "update") {
    message.channel.send("Beginning update");
    updateGifs(message.channel.id);
  }
});


function authenicateGyfcat(){
  gfycat.authenticate((err, data) => {
    //Your app is now authenticated
    assert.equal(data.access_token, gfycat.token);
    console.log('gyfcat token', gfycat.token);
  })
}

function getRandomGif(){
  let options = {userId: "gifyourgame",};
  gfycat.getUserDetails(options).then(data => {
    var numGifs = data.publishedGfycats;

    var rand = Math.floor(Math.random()*numGifs);
    console.log("The council has selected gif #" + rand + " out of " + numGifs + " gifs.")

    getGifAtIndex(rand);
  });
}

function updateGifs(targetIndex, channelId){
  updateGifsHelper('', 100, channelId);
}

var gifList = [];
function updateGifsHelper(cursorIn, max, channelId){
  console.log(cursorIn);
  let options = {userId: 'gifyourgame', cursor: cursorIn,};
  gfycat.userFeed(options).then(data => {
    var gifs = data.gfycats;
    gifs.map(function(d){
      gifList.push(d.gfyId);

    })
    if(gifList.length<max){
      updateGifsHelper(data.cursor, max, channelId);
    }else{
      updateGifsFinally(channelId);
    }
  })
}
function updateGifsFinally(channelId){
  console.log(filename);

  fs.writeFile(filename, JSON.stringify({gifList}), (err) =>{
    if(err){
      console.log("err", err);
      console.log("bot", bot);
      // bot.send(channelId, "gifList failed to update");
      return;
    }
    // bot.send(channelId, "gifList updated");
  })
}


// function getGYGgifs(){
//   let options = {
//     count: 3,
//     cursor: '',
//   };
//
//   gfycat.userFeed(options).then(data => {
//     var gifs = data.gfycats;
//     // console.log(options.userId + " has " + gifs.length + " gifs");
//     var ids = data.gfycats.map(function(d){
//       return d.gfyId;
//     })
//     console.log(ids);
//   })
// }
//
// function getAllGifs(){
//   let options = {
//     count: 3,
//     cursor: '',
//   };
//
//   gfycat.trendingGifs(options).then(data => {
//     var gifs = data.gfycats;
//     console.log(data);
//   })
// }

bot.login(auth.token);
