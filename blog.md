# Creating a Telegram bot to monitor a wallet's activity

I created a telegram bot that allows users to get messages when the balance of the wallet changes.
This can be used for monitoring activity on a personal wallet, or to monitor wallets of certain importance. For instance one could be interested in the activity of _whale_ wallets.

The code for the wallet can be found on [my personal github](https://github.com/davidebenato/nemtelegrambot) under MIT license. If you are familiar with coding I suggest you to have a look at it, it uses [Node.js](https://nodejs.org/) as a backend and it uses a couple of dependencies that can be installed directly from Node's package manager. I will go into more detail later.


### Introduction

The first step to achieve this project was to get familiar with how telegram bots work and getting familiar with the NEM infrastructure and API.

Luckily Telegram has a quite good API and their documentation is quite straightforward.

Starting points are:
* [Introduction to Bots](https://core.telegram.org/bots)
* [Telegram Bot API](https://core.telegram.org/bots/api)

I then immediately created a bot, which can be achieved directly from telegram... talking to the bots' god, botfather!
3
> Use the /newbot command to create a new bot. The BotFather will ask you for a name and username, then generate an authorization token for your new bot.
> The name of your bot is displayed in contact details and elsewhere.
> The Username is a short name, to be used in mentions and telegram.me links. Usernames are 5-32 characters long and are case insensitive, but may only include Latin characters, numbers, and underscores. Your bot's username must end in ‘bot’, e.g. ‘tetris_bot’ or ‘TetrisBot’.
> The token is a string along the lines of 110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw that is required to authorize the bot and send requests to the Bot API.

please save the token, this is your unique key that your bot will need later on to send messages.

Given the nature of the project, I wanted to code something that was easy to deploy and use in different environments. For this purpose *NodeJs* seemed optimal. 

I started looking at packages that would abstract the Telegram API in order to use it within Node and I found one that looked promising: [_telegram node bot_](https://github.com/Naltox/telegram-node-bot)

They have good [documentation](http://nabovyan.xyz/telegram-node-bot/) and it seemed exactly what I needed.

Needles to say I was playing around with their examples and sending/receiving test messages on my own telegram account. Once I confirmed that it was working well I moved on to the second part, getting familiar with NEM API.

[NEM NIS API Documentation](http://bob.nem.ninja/docs/) is quite detailed and easy to read. I was lucky to be familiar with the main concepts already, although there should absolutely be no problem for newcomers to read through the documentation.

What one should know is that there are a bunch of nodes out there that processs transactions and keep in synch the blockchain. In this blockchain we can find all the information we want on any wallet.
There are two approaches to this
* Running a node locally and having the full blockchain
* Connecting to an existing supernode
* 

_Supernodes_ are special nodes that are usually always available. They get rewards for that and we can safely rely on them to retrieve information about wallets' balances, using NEM's API.

A list of Supernodes can be found here:
https://supernodes.nem.io/

Once I picked up a supernode and my wallet address, I digged into the API documentation I found out that the API is real sympe and it consists in an HTTP GET which returns a json object with all the information we need.

An example of returned object is:
```
{
        "account":
        {
        "address": "TALICELCD3XPH4FFI5STGGNSNSWPOTG5E4DS2TOS",
        "balance": 124446551689680,
        "vestedBalance": 104443451691625,
        "importance": 0.010263666447108395,
        "publicKey": "a11a1a6c17a24252e674d151713cdf51991ad101751e4af02a20c61b59f1fe1a",
        "label": null,
        "harvestedBlocks": 645
        },
        "meta":
        {
        "cosignatoryOf": [ ],
        "cosignatories": [ ],
        "status": "LOCKED",
        "remoteStatus": "ACTIVE"
        }
        }
```

The tech savvy could even try retrieving account metadata with an internet browser!

### Connecting all the pieces together

I now know how to set up a bot, how to retrieve account information, all I needed was to actually code the logic and set up the bot.

I decided to save the full json object in local, and map it to the user who initiated the chat. Every minute I would query all the wallets I have saved in local, and check if the balance has been changed.

If so, a message to the user will be triggered and the new wallet saved in local.

At the moment we notify only on balance change, but the logic could be expanded to notify also on different triggers.

### Installing

The installation procedure is very easy and it can be done through the following simple steps.
Beforehand jsut be sure to have `Node` installed for your platform.

```
#get the code (if you don't like git you can also download the code in a zip file)
git clone https://github.com/davidebenato/nemtelegrambot.git
cd nemtelegrambot
#install dependencies
npm install telegram-node-bot
npm install node-persist
```

#### Configuring the bot:

In the main folder there is a file called `config.json` which is used to parametrize the bot.
It contains:
```
{
  "nis_address": "85.25.36.97",
  "telegram_key": "write_your_telegram_key_here",
  "local_port": 7776
}
```

* `nis_address` is the address of the supernode you want to connect to. Unless you have problems you can leave it as is. Otherwise you can pick a stable node from https://supernodes.nem.io/
* `telegram_key` is the key that `botfather` gave you when you registered your new bot
* `local_port` is the administration port of the bot. If you login from your browser to `localhost:local_port` you will be able to see the logs of the bot. If you are running multiple instances of the bot you will need to chose a unique port per instance.
* 

### Running the bot

running the bot is as simple as launching:
```
$> node index.js
```

## Using the bot

The bot supports two commands:
* `/help` 
* `/register`
* `/balance`

`/help` will prompt you with the following message:
```
NemNotifier:
This bot registers a NEM wallet and notifies you when the balance changes
 /register to register a new wallet
 /balance to see your current balance
 ```
 
 Time to register a new wallet!
 
 ```
 Davide:
/register
[7:45:53 PM] NemNotifier:
Send me the wallet you'd like to register
[7:43:19 PM] Davide:
NAYFRF-6C2DZK-KEQEE2-SNVBBD-G354SY-F4XHMY-JDFP
[7:45:56 PM] NemNotifier:
Registered wallet: NAYFRF-6C2DZK-KEQEE2-SNVBBD-G354SY-F4XHMY-JDFP
```
A note should be added. The wallet has to be in the correct format, with the dash separators as in the example above.
What helped me was also to look up the wallet I was using in the official tool to check the blockchain.

For example for this wallet you can see all the information you need at the following address:
http://chain.nem.ninja/#/search/NAYFRF6C2DZKKEQEE2SNVBBDG354SYF4XHMYJDFP

Let's now query our wallet!
```
[7:48:40 PM] Davide:
 /balance
[7:48:41 PM] NemNotifier:
registered wallets -> NAYFRF6C2DZKKEQEE2SNVBBDG354SYF4XHMYJDFP balance: 15809.1
```

In case the balance on the account you are monitoring changes, you will receive a message that looks like:

```
[17:48:41PM] NemNotifier:
Balance for [NCPAYOUTH2BGEGT3Q7K75PV27QKMVNN2IZRVZWMD] was [5809.1] and now it's [15809.1]
```

That's all for now! 



