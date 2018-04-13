require('dotenv').config()

/******************             Imports              ******************/
const Discord = require("discord.js");
const Gfycat = require('gfycat-sdk');
const assert = require('assert');
const fs = require('fs');
const URL = require('url');
const Parse = require('parse/node')
const { addLike, removeLike, addDislike, removeDislike, getRandomGif, getTopLikedGifs, isGYG }  = require('./src/utils/dbUtil.js');

const bot = new Discord.Client();

var configs = {
  botToken : "",
  gfycatId : "",
  gfycatToken : ""
}

var configFile = "./configs/server/config.json";
var commandsFile = "./configs/commands.json";
var config; //= require(configFile);
var local = false;
var commands = require(commandsFile);
fs.stat('./configs/local/config.json', function(err, stat) {
    if(err == null) {
      console.log('Being hosted locally, loading configs from file');
      local = true;
      configFile = "./configs/local/config.json";
    } else if(err.code == 'ENOENT') {
      console.log('Being hosted online, attempting to load configs');
    }
    configs.botToken = process.env.botToken;
    configs.gfycatId = process.env.gfycatId;
    configs.gfycatToken = process.env.gfycatToken;

    //Importing config file
    config = require(configFile);
    // console.log(config);

    //Gyfcat authentication
    var gfycat = new Gfycat({clientId: configs.gfycatId, clientSecret: configs.gfycatToken});
    gfycat.authenticate((err, data) => {
      assert.equal(data.access_token, gfycat.token);
    })
    bot.login(configs.botToken);

});


/******************             Bot Stuff              ******************/
bot.on("ready", () => {
  console.log(`Bot is up and running started, in ${bot.guilds.size} servers:`);
  for(var [key, value] of bot.guilds){
    console.log('...\t' + value.name);
  }
});


bot.on("guildCreate", guild => {
  console.log(`Bot has been added to server: ${guild.name} (id: ${guild.id})`);
});

bot.on("guildDelete", guild => {
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});


/******************             Reactions              ******************/

bot.on('messageReactionAdd', (reaction, user) => {
  var msg = reaction.message.content;
  var gfyName = getGfyPath(msg);
  if(!isGYG(gfyName)){
    return;
  }
  // console.log(user.username + " reacted " + reaction.emoji.name + " to " + gifId);
  if(reaction.emoji.name === "👍"){
    addLike(user.id, gfyName);
  } else if(reaction.emoji.name === "👎"){
    addDislike(user.id, gfyName);
  }

});

bot.on('messageReactionRemove', (reaction, user) => {
  var msg = reaction.message.content;
  var gfyName = getGfyPath(msg);
  if(!isGYG(gfyName)){
    return;
  }

  // console.log(user.username + " removed reaction " + reaction.emoji.name + " to " + gifId);
  if(reaction.emoji.name === "👍"){
    removeLike(user.id, gfyName);
  } else if(reaction.emoji.name === "👎"){
    removeDislike(user.id, gfyName);
  }
});

/******************             Messages              ******************/
bot.on("message", async message => {
  var gfyName = getGfyPath(message.content);
  if(isGYG(gfyName)){
    addReactions(message);
  }

  if(message.content.indexOf(config.prefix) !== 0) return;  //Ensure prefix is used in message

  var channel = message.channel.id;
  var channelIndex = config.channels.indexOf(channel);

  if(message.content == config.prefix+commands.addToChannel){
    if(channelIndex == -1){
      config.channels.push(channel);
      updateConfig();
      message.channel.send("I'm ready to go!");
    }else{
      message.channel.send("I am already active in this channel!");
    }
  }
  else if(message.content == config.prefix+commands.removeFromChannel){
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
/************    MESSAGES     *********************/
  if(command === commands.randomGif) {
    Parse.Promise.when(getRandomGif()).then(function(gif){
      console.log("... \t", gif.gif);
      var user = bot.users.get(gif.user);
      var name = user.username+"#"+user.discriminator;
      message.channel.send("***" + name + "'s*** goal, with a score of **"+gif.score+"**");
      message.channel.send("https://gfycat.com/"+gif.gif);
    });
  }

  if(command === commands.topGif) {
    var num = 1;
    if(args.length > 0 && Number.isInteger(parseInt(args[0]))) {
      var val  = parseInt(args[0]);
      if(val > 0 && val < 100){
        num = val;
      }
    }

    Parse.Promise.when(getTopLikedGifs(num)).then(function(gif){
      if(!gif.success){
        console.log("... There arent that many rated gifs");
        message.channel.send("There arent that many voted gifs!");
      }else{
        console.log("... \t", gif.gif);
        var user = bot.users.get(gif.user);
        var name = user.username+"#"+user.discriminator;
        message.channel.send("Currently, ***" + name + "*** holds the **Rank " + num + "** gif with a score of **"+gif.score+"**");
        message.channel.send("https://gfycat.com/"+gif.gif);
      }
    });
  }
});


/******************             Helper Functions              ******************/
async function addReactions(message){
  await message.react('👍');
  await message.react('👎');
}

function getGfyPath(message) {
  var arr = message.split(' ');
  for(var i = arr.length; i-- > 0; ){
    var str = arr[i];
    var url = URL.parse(str);
    if(url.host){
      if(url.hostname=="gfycat.com")
        return url.pathname.substring(1);
      else{
        return undefined;
      }
    }
  }
  return undefined;
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
