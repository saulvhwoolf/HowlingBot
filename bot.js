// Load up the discord.js library
const Discord = require("discord.js");
const bot = new Discord.Client();
const Gfycat = require('gfycat-sdk');
const assert = require('assert');
const axios = require("axios");
const fs = require('fs');

var configs = {
  botToken : "",
  gfycatId : "",
  gfycatToken : ""
}

fs.stat('./auth.json', function(err, stat) {
    if(err == null) {
      console.log('Being hosted locally, loading configs from file');
      // auth.token contains the discord bot's token
      const auth = require("./auth.json");
      configs.botToken = auth.token;
      configs.gfycatId = auth.gyfcat_id;
      configs.gfycatToken = auth.gyfcat_secret;
    } else if(err.code == 'ENOENT') {
      console.log('Being hosted online, attempting to load configs');
      configs.botToken = process.env.botToken;
      configs.gfycatId = process.env.gfycatId;
      configs.gfycatToken = process.env.gfycatToken;
    }
    console.log(configs);

    //Gyfcat authentication
    var gfycat = new Gfycat({clientId: configs.gfycatId, clientSecret: configs.gfycatToken});
    gfycat.authenticate((err, data) => {
      assert.equal(data.access_token, gfycat.token);
    })
    bot.login(configs.botToken);

});



const config = require("./config.json");
// config.prefix contains the message prefix.

var filename = "./gifs.json";
const gifsFile = require(filename);


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
    var ch = message.channel;
    getRandomGif(ch);
  }
  if(command === "update") {
    var numItems = 100;
    if(args.length > 0){
      var temp = parseInt(args[0]);
      if(!Number.isInteger(temp)){
        message.channel.send("First paramter needs to be an integer. You entered '"+  args[0] +"'");
        return;
      }else if(temp > 10000 || temp < 0){
        message.channel.send("First parameter needs to be between 0 and 10000. You entered '"+  args[0] +"'");
        return;
      }else{
        numItems = temp;
      }
    }

    var ch = message.channel;
    message.channel.send("Beginning update of " + numItems + " items.");
    updateGifs(numItems, ch);
  }
});



var testCursor = "";//"bm9uY2V8eyJnIjoia2luZGx5Y2FyaW5nZ2FyIiwiZCI6IjE1MjI5MDI3MzMiLCJmIjoiMSJ9";

function updateGifs(numGifs, channelId){
  console.log("Attempting to load " + numGifs + " gifs...")
  updateGifsHelper(testCursor, numGifs, channelId);
}

var gifList = [];
function updateGifsHelper(cursor, max, channelId){
  console.log("\t...Loaded " + gifList.length + " gifs");

  var url = "https://api.gfycat.com/v1/users/gifyourgame/gfycats?cursor="+cursor;
  axios
    .get(url)
    .then(response =>{
      for(var gfycat of response.data.gfycats){
        gifList.push(gfycat.gfyId);
      }

      if(gifList.length<max){
        updateGifsHelper(response.data.cursor, max, channelId);
      }else{
        updateGifsFinally(channelId);
      }
    })
    .catch(error=>{
      console.log(error);
    })
}

function updateGifsFinally(channel){
  console.log("\tSuccessfully loaded " + gifList.length + " gifs");
  // const channel = member.guild.channels.find('id', channelId);
  fs.writeFile(filename, JSON.stringify({gifList}), (err) =>{
    if(err){
      console.log("err", err);
      console.log("bot", bot);
      channel.send("Update Failed...\n"+err);

      return;
    }
    channel.send("Updated database now includes " + gifList.length + " entries.");
  })
}

function getRandomGif(channel){
  fs.readFile(filename, 'utf8', function (err, data) {
    if (err) throw err;
    var list = JSON.parse(data).gifList;
    var randomIndex = Math.floor(Math.random()*list.length)
    var item = list[randomIndex];
    channel.send("Check this out!\nhttps://gfycat.com/"+item);


  });
}
