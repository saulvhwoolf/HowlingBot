/******************             Imports              ******************/
const Discord = require("discord.js");
const Gfycat = require('gfycat-sdk');
const assert = require('assert');
const fs = require('fs');
const Parse = require('parse/node')
const { addLike, removeLike, addDislike, removeDislike, getRandomGif, getTopLikedGifs }  = require('./src/utils/dbUtil.js');

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
var auth = require("./auth.json");
var commands = require(commandsFile);
fs.stat('./auth.json', function(err, stat) {
    if(err == null) {
      console.log('Being hosted locally, loading configs from file');
      local = true;
      configFile = "./configs/local/config.json";

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

    //Importing config file
    config = require(configFile);

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
  if(msg.indexOf("https://gfycat.com/")!=0 || user.id == "431226194411651082"){return;}
  var gifId = msg.substring("https://gfycat.com/".length,msg.length)

  // console.log(user.username + " reacted " + reaction.emoji.name + " to " + gifId);
  if(reaction.emoji.name === "👍"){
    addLike(user.id, gifId);
  } else if(reaction.emoji.name === "👎"){
    addDislike(user.id, gifId);
  }

});

bot.on('messageReactionRemove', (reaction, user) => {
  var msg = reaction.message.content;
  if(msg.indexOf("https://gfycat.com/")!=0 || user.id == "431226194411651082"){return;}
  var gifId = msg.substring("https://gfycat.com/".length,msg.length)

  // console.log(user.username + " removed reaction " + reaction.emoji.name + " to " + gifId);
  if(reaction.emoji.name === "👍"){
    removeLike(user.id, gifId);
  } else if(reaction.emoji.name === "👎"){
    removeDislike(user.id, gifId);
  }
});

/******************             Messages              ******************/
bot.on("message", async message => {
  if(message.content.indexOf("https://gfycat.com/") == 0){
    addReactions(message);
  }

  if(message.content.indexOf(config.prefix) !== 0) return;  //Ensure prefix is used in message

  var channel = message.channel.id;
  var channelIndex = config.channels.indexOf(channel);

  if(message.content == config.prefix+commands.addToChannel){
    if(channelIndex == -1){
      config.channels.push(thisCh);
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

function updateConfig(){
  fs.writeFile(configFile, JSON.stringify(config), (err) =>{
    if(err){
      console.log("Failed to update configs:\n\t", err);
      return;
    }
    console.log("Successfully updated configs");
  })
}
