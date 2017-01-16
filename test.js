'use strict'


var storage = require('node-persist');
storage.initSync();

Array.prototype.contains = function(element){
    return this.indexOf(element) > -1;
};


//TODO add a command to return list of registered wallets from a chat id

    function checkAccounts(){
        //console.log("callback")
        //tg.api.sendMessage(302414140, 'pong')
        storage.forEach(function(key, value) {

        console.log(new Date().toString() + " chatId: " + key);

        //var result = value.wallet
        for (var i = 0; i < value.length; i++) {
            console.log('registered wallets -> ' + value[i].account.address)

            //TODO check if something changed
        }

        });
    }

checkAccounts()

process.exit()