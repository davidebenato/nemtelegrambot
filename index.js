'use strict'

const NEM     = require('./nodejs2nem/NEM.js');
const Telegram = require('telegram-node-bot')
const TelegramBaseController = Telegram.TelegramBaseController
const StartController = Telegram.StartController
const TextCommand = Telegram.TextCommand

var storage = require('node-persist');
storage.initSync();

var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

var telegram_key = config.telegram_key

console.log("nis address: " + config.nis_address)
console.log("telegram_key: " + config.telegram_key)

var conf = { 'nis_address': config.nis_address};

var nem = new NEM(conf);

Array.prototype.contains = function(element){
    return this.indexOf(element) > -1;
};

const tg = new Telegram.Telegram(telegram_key,
{ 
    workers: 1,
    webAdmin: {
        port: config.local_port,
        host: 'localhost'
    }
})


function readAddress(address, old_wallet, chat_id, cb){
    //formatting the address removing the -
    address = address.replace(/-/g,"")
    
    console.log("querying: " + address)

    var query = '/account/get?address=' + address 
        nem.nisGet(query, null
        ,function(err) {
            console.log(err)
            tg.api.sendMessage(chat_id, 'Error while querying wallet: [' + old_wallet.account.address + "]")
            tg.api.sendMessage(chat_id, 'Error= {' + err + '}')
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
            cb(old_wallet, res, chat_id)
            return;
        });
}


tg.onMaster(() => {

    function checkAccounts(){
        storage.forEach(function(key, value) {

        console.log(new Date().toString() + " chatId: " + key);

        var chat_id = parseInt(key)

        console.log('registered wallet -> ' + value.account.address)

        //query the wallet:
        var old_wallet = value
        var wallet_key = value.account.address
        readAddress(wallet_key, old_wallet, chat_id, function (old_wallet, wallet, chat_id) {

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
            if(wallet.account.balance != old_wallet.account.balance){
                tg.api.sendMessage(chat_id, 'Balance for [' + wallet_key + '] was [' + old_wallet.account.balance 
                    + "] and now it's [" + wallet.account.balance+ "]")

                //saving results
                console.log('saving wallet')
                storage.setItemSync(chat_id.toString(), wallet);
            }
            else{
                console.log("balance didn't change: " + wallet.account.balance)
            }
        })

    })

    }
    //checking every minunte
    setInterval(checkAccounts, 1 * 60000); 
})


tg.onMaster(() => {
    var opt = nem.getOptions();
    console.log(opt);
})



class BalanceController extends TelegramBaseController {
   /**
   * @param {Scope} $
   */
    balanceHandler($) {
        storage.initSync();
        var result = storage.getItemSync($.chatId.toString())
        if(result){
            $.sendMessage('registered wallets -> ' + result.account.address + " balance: " + result.account.balance)
        }
    }

    get routes() {
        return {
            'balanceCommand': 'balanceHandler'
        }
    }
}

class HelpController extends TelegramBaseController {
   /**
   * @param {Scope} $
   */
    helpHandler($) {
        $.sendMessage('This bot registers a NEM wallet and notifies you when the balance changes')
        $.sendMessage('/register to register a new wallet')
        $.sendMessage('/balance to see your current balance')
    }

    get routes() {
        return {
            'helpCommand': 'helpHandler'
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
                        return
                    }

                    //reading/saving wallet
                    readAddress(wallet_key, null, null, function (old, wallet, chat_id) {

                        if(wallet.error != undefined && wallet.error){
                            console.log(wallet)
                            $.sendMessage('Error: ' + wallet.error + ' -> ' + wallet.message)
                            return
                        }
                        
                        if(wallet.error != undefined && wallet.error){
                            console.log(wallet)
                            return   
                        }

                        storage.setItemSync($.chatId.toString(), wallet);

                        $.sendMessage('Registered wallet: ' + wallet_key)
                        })

                    callback(true, message.text) //you must pass the result also
                    return
                }
            }
        }

        $.runForm(form, (result) => {
        })
    }

    get routes() {
        return {
            'registerCommand': 'registerHandler'
        }
    }
}

tg.router
    .when(new TextCommand('/help', 'helpCommand'), new HelpController())
    .when(new TextCommand('/balance', 'balanceCommand'), new BalanceController())
    .when(new TextCommand('/register', 'registerCommand'),new RegisterController())
    .otherwise(new OtherwiseController())

console.log("Starting bot!")
