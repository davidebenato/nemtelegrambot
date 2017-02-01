'use strict'

const NEM     = require('./nodejs2nem/NEM.js');
const Telegram = require('telegram-node-bot')
const TelegramBaseController = Telegram.TelegramBaseController
const StartController = Telegram.StartController
const TextCommand = Telegram.TextCommand

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

function makeDir(dirname)
{
    if (!fs.existsSync(dirname)){
        fs.mkdirSync(dirname);
    }
}

function getDirectories (srcpath) {
   const fs = require('fs')
   const path = require('path')

  return fs.readdirSync(srcpath)
    .filter(file => fs.statSync(path.join(srcpath, file)).isDirectory())
}

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

        var dirs = getDirectories('./.storage')

        for (var i = 0, len = dirs.length; i < len; i++) {
            var chat_id = dirs[i]
            console.log(chat_id)

            // looping through all the chat ids
            var wallets_dir = './.storage/' + chat_id
            var files = fs.readdirSync(wallets_dir)
            for (var w = 0; w < files.length; w++) {
                var old_wallet = JSON.parse(fs.readFileSync(wallets_dir + '/' + files[w], 'utf8'))

                var wallet_key = files[w]
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
                        tg.api.sendMessage(chat_id, 'Balance for [' + old_wallet.account.address + '] was [' + old_wallet.account.balance 
                            + "] and now it's [" + wallet.account.balance+ "]")

                        //saving results
                        console.log('saving wallet: ' + wallet.account.address)

                        var storage_dir = './.storage/' + chat_id
                        var json_string = JSON.stringify(wallet);
                        fs.writeFile(storage_dir + '/' + wallet.account.address, json_string, function (err) {
                            if (err) return console.log(err);
                        });
                    }
                    else{
                        console.log("balance didn't change: " + wallet.account.address + " " + wallet.account.balance)
                    }
                })
           }
        }

    }
    //checking every 2 minutes
    setInterval(checkAccounts, 1 * 120000)
})


tg.onMaster(() => {
    var opt = nem.getOptions();
    console.log(opt);

    //setting up storage
    makeDir('./.storage')
})


class BalanceController extends TelegramBaseController {
   /**
   * @param {Scope} $
   */
    balanceHandler($) {
        // setting up storage folder
        var wallets_dir = './.storage/' + $.chatId.toString()
        if (!fs.existsSync(wallets_dir)){
            $.sendMessage("you don't have any wallets registered!")
        }

        var files = fs.readdirSync(wallets_dir);
        
        for (var i = 0, len = files.length; i < len; i++) {
            var wallet = JSON.parse(fs.readFileSync(wallets_dir + '/' + files[i], 'utf8'))
            $.sendMessage(files[i] + " balance: " + wallet.account.balance)
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

                    var wallet_key = message.text.toString().toUpperCase().trim()
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

                        var storage_dir = "./.storage/" + $.chatId.toString()
                        makeDir(storage_dir)

                        var json_string = JSON.stringify(wallet)
                        fs.writeFile(storage_dir + '/' + wallet.account.address, json_string, function (err) {
                            if (err) return console.log(err);
                            console.log('File saved: ' + wallet.account.address);
                        });

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
