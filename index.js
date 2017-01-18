'use strict'

const NEM     = require('./nodejs2nem/NEM.js');

const Telegram = require('telegram-node-bot')
const TelegramBaseController = Telegram.TelegramBaseController
const StartController = Telegram.StartController
const TextCommand = Telegram.TextCommand

var storage = require('node-persist');
storage.initSync();

//setting up the NEM api
//var conf = { 'nis_address': 'go.nem.ninja'};
var conf = { 'nis_address': '85.25.36.97'};

var nem = new NEM(conf);

Array.prototype.contains = function(element){
    return this.indexOf(element) > -1;
};

const tg = new Telegram.Telegram('280681948:AAHSHszkiaa_4_u9vRekdE1PHKLPw5yedP0', {
    workers: 1
})

function readAddress(address, old_wallet, cb){
    //formatting the address removing the -
    address = address.replace(/-/g,"")
    
    console.log("querying: " + address)
            
    var query = '/account/get?address=' + address 
        nem.nisGet(query, null
        ,function(err) {
            // error handler function

            // output error here
            console.log(err);
            // or call other functions 

        }
        ,function(res) {

            if(res.error != undefined && res.error){
                console.log(res)
                cb(old_wallet, res)
                return;
            }

            res.account.balance = res.account.balance/1000000
            res.account.vestedBalance = res.account.vestedBalance/1000000
            //response handler function
            // output the  response here
            console.log(res);
            // or call other user defined code 
            cb(old_wallet, res)
            return;
        });
}


//TODO add a command to return list of registered wallets from a chat id

tg.onMaster(() => {
    function checkAccounts(){
        //console.log("callback")
        //tg.api.sendMessage(302414140, 'pong')
        storage.forEach(function(key, value) {

        console.log(new Date().toString() + " chatId: " + key);

        //var result = value.wallet
        var chat_id = parseInt(key)
        for (var i = 0; i < value.length; i++) {
            console.log('registered wallets -> ' + value[i].account.address)

            //TODO check if something changed

            //query the wallets:
            var old_wallet = value[i]
            var wallet_key = value[i].account.address
            readAddress(wallet_key, old_wallet, function (old_wallet, wallet) {

                if(wallet.error != undefined && wallet.error){
                    console.log(wallet)
                    $.sendMessage('Error: ' + wallet.error + ' -> ' + wallet.message)
                    return
                }
                
                if(wallet.error != undefined && wallet.error){
                    console.log(wallet)
                    return
                }

                //TODO add more checks here if you want to be notified of different things
                //TODO if things changed delete old wallet and store the new one
                if(wallet.account.balance != old_wallet.account.balance){
                    //tg.api.sendMessage(302414140, 'pong')
                    tg.api.sendMessage(chat_id, 'Balance for [' + wallet_key + '] was [' + old_wallet.account.balance 
                        + "] and now it's [" + wallet.account.balance+ "]")

                }
                else{
                    console.log("balance didn't change: " + wallet.account.balance)
                    return;
                }
                
                //storage.setItemSync($.chatId.toString(), result);
                //$.sendMessage('Registered wallet: ' + wallet_key)
            })
        }

        });
    }

    setInterval(checkAccounts, 1 * 30000); 

})


tg.onMaster(() => {
    var opt = nem.getOptions();
    console.log(opt);
})



class PingController extends TelegramBaseController {
   /**
   * @param {Scope} $
   */
    pingHandler($) {
        //storage.setItemSync($.chatId, "test");
        //console.log("registered wallet: " + storage.getItemSync($.chatId)); // yourname

        $.sendMessage('pong: chatId -> ' + $.chatId)
        //$.sendMessage('wallets -> ' + storage.valuesWithKeyMatch($.chatId.toString()))

        var result = storage.getItemSync($.chatId.toString()).wallet
        //result.push("yetanotherwallet")
        for (var i = 0; i < result.length; i++) {
            $.sendMessage('registered wallets -> ' + result[i])
        }
    }

    get routes() {
        return {
            'pingCommand': 'pingHandler'
        }
    }
}

class OtherwiseController extends TelegramBaseController {
    handle() {
        console.log('otherwise')
    }
}

class RegisterController extends TelegramBaseController {
   /**
   * @param {Scope} $
   */
    registerHandler($) {

        const form = {
            wallet: {
                q: 'Send me the wallet you\'d like to register',
                error: 'sorry, wrong input',
                validator: (message, callback) => {

                    var wallet_key = message.text.toString()
                    if(!wallet_key || wallet_key.length != 46){
                        $.sendMessage("wrong address, please provide a well formed address [NAYFRF-6C2DZK-KEQEE2-SNVBBD-G354SY-F4XHMY-JDFP]")
                        //callback(false)
                        return
                    }

                    //TODO check if we already have a value first
                    var keys = storage.keys()

                    console.log("includes chatID: " + keys.contains($.chatId.toString()))

                    //new client
                    if(!keys.contains($.chatId.toString()))
                    {
                        readAddress(wallet_key, null, function (old, wallet) {

                            if(wallet.error != undefined && wallet.error){
                                console.log(wallet)
                                $.sendMessage('Error: ' + wallet.error + ' -> ' + wallet.message)
                                return
                            }
                            
                            var result = [];
                            if(wallet.error != undefined && wallet.error){
                                console.log(wallet)
                                return   
                            }

                            result.push(wallet)
                            storage.setItemSync($.chatId.toString(), result);

                            $.sendMessage('Registered wallet: ' + wallet_key)
                            })
                        return;
                    }
                    else
                    {
                        //existing client, adding address to eisting key
                        var result = storage.getItemSync($.chatId.toString())
                        
                        for (var i = 0; i < result.length; i++) {
                            if(result[i].account.address == wallet_key.replace(/-/g,"")){
                                $.sendMessage('Already registered: ' + wallet_key)
                                return;
                            }
                        }

                        readAddress(wallet_key, null, function (old, wallet) {

                            if(wallet.error != undefined && wallet.error){
                                console.log(wallet)
                                $.sendMessage('Error: ' + wallet.error + ' -> ' + wallet.message)
                                return
                            }
                            
                            if(wallet.error != undefined && wallet.error){
                                console.log(wallet)                                
                            }
                            result.push(wallet)

                            storage.setItemSync($.chatId.toString(), result);
                            $.sendMessage('Registered wallet: ' + wallet_key)
                            })


                        
                        /*
                        for (var wallet in result) {
                            console.log(wallet)
                            if(wallet.account.address == wallet_key.replace(/-/g,"")){
                                $.sendMessage('Already registered: ' + wallet_key)
                                return;
                            }
                        }
                        */
                        //  if (goals.hasOwnProperty(name)) {
                            //result.push({name: name, goals: goals[name]});
                        //  }

                        return
                    }

                    //todo we also need to save the current amount of NEM that are in the wallet right now
                    
                    //var result = storage.getItemSync($.chatId.toString()).wallets
                    //check that it's not duplicated first (insert only if we don't have it already)
                    //result.push(message.text)

                    //var w = [message.text, "testwallet"]
                    //w.push("anotherwallet")
                    //storage.setItemSync($.chatId.toString(), {wallet: result});
                    //storage.setItemSync($.chatId.toString(), values.wallet);

                    /*

                    var r = storage.getItemSync($.chatId.toString()).wallets
                    for (var i = 0; i < r.length; i++) {
                        console.log("wallet: " + r[i])
                    }
                    */
                    //console.log("registered wallet: " + storage.getItemSync($.chatId.toString()).wallet.toString()); // yourname
                    //console.log(storage.values())
                    callback(true, message.text) //you must pass the result also
                    return
                }
            }
        }

        $.runForm(form, (result) => {
            //console.log(result)
            //$.sendMessage('registered!')
        })
        //$.sendMessage('registered!')
    }

    get routes() {
        return {
            'registerCommand': 'registerHandler'
        }
    }
}

tg.router
    //.when(new TextCommand('/start', 'startHandler'), new StartController())
    .when(new TextCommand('/ping', 'pingCommand'), new PingController())
    .when(new TextCommand('/register', 'registerCommand'),new RegisterController())
    .otherwise(new OtherwiseController())


console.log("Starting bot!")
