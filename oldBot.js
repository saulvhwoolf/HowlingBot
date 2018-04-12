// Load up the discord.js library
const Discord = require("discord.js");
const bot = new Discord.Client();
const Gfycat = require('gfycat-sdk');
const assert = require('assert');
const axios = require("axios");
const fs = require('fs');

const { updateGifs } = require('./src/utils/updateLocalDB')
const { getRandomGif } = require('./src/utils/getData')


var configs = {
  botToken : "",
  gfycatId : "",
  gfycatToken : ""
}

var configFile = "./data/server/config.json";
var dataFile = "./data/server/gifs.json";
var config; //= require(configFile);

fs.stat('./auth.json', function(err, stat) {
    if(err == null) {
      console.log('Being hosted locally, loading configs from file');
      configFile = "./data/local/config.json";
      dataFile = "./data/local/gifs.json";

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
    config = require(configFile);

    //Gyfcat authentication
    var gfycat = new Gfycat({clientId: configs.gfycatId, clientSecret: configs.gfycatToken});
    gfycat.authenticate((err, data) => {
      assert.equal(data.access_token, gfycat.token);
    })
    bot.login(configs.botToken);


});



//On bot launch
bot.on("ready", () => {
  console.log(`Bot is up and running started, in ${bot.guilds.size} servers:`);
  for(var [key, value] of bot.guilds){
    console.log('\t' + value.name);
  }
  bot.user.setActivity('games with your heart.');
  bot.user.setUsername('HowlingBot');

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

  var thisCh = message.channel.id;
  var channelIndex = config.channels.indexOf(thisCh);

  if(message.content == config.prefix+"addHB"){
    if(channelIndex == -1){
      config.channels.push(thisCh);
      updateConfig();
      message.channel.send("I'm ready to go!");
    }else{
      message.channel.send("I am already active in this channel!");
    }
  }else if(message.content == config.prefix+"removeHB"){
    if(channelIndex >= 0){
      config.channels.splice(channelIndex, 1);
      updateConfig();
      message.channel.send("I didn't want to be here anyways... :( :(");
    }else{
      message.channel.send("I wasn't active in this channel to begin with...");
    }
  }
  //Check that channel is correct
  if(config.channels.indexOf(message.channel.id)==-1) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();


  // if(command === "ping") {
  //   const m = await message.channel.send("Ping?");
  //   m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(bot.ping)}ms`);
  // }
  if(command === "random") {
    var ch = message.channel;
    getRandomGif(ch, dataFile, randomGifCallback);
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
    updateGifs(ch, numItems, updateCallback);
  }
});


function updateCallback(err, numGifs, channel){
  if(err){
    channel.send("Update Failed...\n"+err);
    console.log("Update failed...\n\t"+err);
  }else{
    channel.send("Updated database now includes " + numGifs + " entries.");
    console.log("Success...\n\tUpdated database now includes " + numGifs + " entries.")
  }
}

function randomGifCallback(err, gifData, channel){
  if(err){
    console.log("Failed to get gif...\n\t"+err);
  }else{
    channel.send("Check this out!\nhttps://gfycat.com/"+gifData);
  }
}


function updateConfig(){
  fs.writeFile(configFile, JSON.stringify(config), (err) =>{
    if(err){
      console.log("Failed to update configs:\n\t", err);
      return;
    }
    console.log("Successfully updated configs");
  })
}
