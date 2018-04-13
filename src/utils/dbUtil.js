require('dotenv').config()
const Parse = require('parse/node')
const fs = require('fs')


Parse.initialize(process.env.PARSE_APPLICATION_ID)
Parse.serverURL = process.env.PARSE_SERVER_URL || 'https://api.parse.com/1'
Parse.masterKey = process.env.PARSE_MASTER_KEY


const Clip = Parse.Object.extend("Clip");
const User = Parse.Object.extend("User");

exports.addLike = function(userId, gifId){
  console.log("Adding like "+ userId + " to "+gifId);
  updateArray(gifId, userId, "likesArray", "add");
}

exports.removeLike = function(userId, gifId){
  console.log("Removing like "+ userId + " to "+gifId);
  updateArray(gifId, userId, "likesArray", "remove");
}

exports.addDislike = function(userId, gifId){
  console.log("Adding dislike "+ userId + " to "+gifId);
  updateArray(gifId, userId, "dislikesArray", "add");
}

exports.removeDislike = function(userId, gifId){
  console.log("Removing dislike "+ userId + " to "+gifId);
  updateArray(gifId, userId, "dislikesArray", "remove");
}

function updateArray(gifId, discordId, arrayName, updateType){
  return gifByID(gifId).then(function(gif){
    console.log("...likes", gif.get("likesArray"));
    console.log("...dislikes", gif.get("dislikesArray"));

    var theArray = gif.get(arrayName);
    if(!gif.get(arrayName)){
      gif.set(arrayName, []);
    }

    if(updateType == "add")
      gif.addUnique(arrayName, discordId)
    else if(updateType == "remove")
      gif.remove(arrayName, discordId)

    var likeScore = 0;
    if(gif.get("likesArray"))
      likeScore+=gif.get("likesArray").length;
    if(gif.get("dislikesArray"))
      likeScore-=gif.get("dislikesArray").length;
    gif.set("score", likeScore)

    gif.save(null, {useMasterKey:true})
    console.log("===>", gif.get(arrayName));
    return gif;
  })
}

exports.getRandomGif = function(){
  console.log("Getting random gif")
  return gifCount().then(function(count){
    var randIndex = Math.floor(Math.random()*count);
    return gifByIdex(randIndex).then(function(gif){
      var id = gif.get("gif");
      if(!id){
        console.log("... failed, trying again")
        return exports.getRandomGif();
      }else{
        var agif = getDataFromGif(gif)
        return agif;
      }
    })
  });
}

function gifCount(){
  var query = new Parse.Query(Clip);
  query.equalTo("gifContentType", "gif/gfycat");
  return query.count({ useMasterKey: true }).then(function(count){
    return(count);
  })
}

function gifByIdex(index){
  var query = new Parse.Query(Clip);
  query.include('user');
  query.equalTo("gifContentType", "gif/gfycat");
  query.skip(index-1);
  return query.first({ useMasterKey: true }).then(function(gif){
    return gif;
  })
}

function gifByID(id){
  var query = new Parse.Query(Clip);
  // query.include('user');
  query.equalTo("gif", id);
  return query.first({ useMasterKey: true }).then(function(gif){
    return gif;
  })
}

exports.getTopLikedGifs = function(num){
  console.log("Getting top-rated #",num)
  var query = new Parse.Query(Clip);
  query.include('user');
  query.exists("score")  // query.skip(40)
  query.descending("score")  // query.skip(40)
  query.equalTo("type", "goal")
  query.skip(num-1);
  return query.find({useMasterKey:true})
  .then(function(gifs){
    if(gifs.length==0){
      return {  success:false }
    }else{
      return getDataFromGif(gifs[0]);
    }
  })
}

exports.isGYG = function(id){
  if(!id)
    return undefined;
  return gifByID(id).then(function(gif){
    return !!gif;
  })
}

function userByDiscordId(id){
  var query = new Parse.Query(User);
  query.skip(40)
  return query.first({useMasterKey:true}).then(function(user){
    console.log("User", JSON.stringify(user));
  })
}

function getDataFromGif(gif){
  var score = gif.get("score");
  if(!score){
    gif.set("score", 0);
    gif.save(null, {useMasterKey:true})
  }

  var result = {
    success : true,
    gif : gif.get("gif"),
    user : gif.get("user").get("authData").discord.id,
    score: gif.get("score")
  };
  return result;
}
