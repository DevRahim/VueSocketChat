<template>
  <div id="app" @keydown="keyDown($event)">
    <ul class="pages">
      <li class="chat page">
        <div class="chatArea">
          <ul class="messages"></ul>
        </div>
        <input class="inputMessage" @input="updateTyping" v-model="messageText" placeholder="Type here..."/>
      </li>
      <li class="login page">
        <div class="form">
          <h3 class="title">What's your nickname?</h3>
          <input class="usernameInput" v-model="sender" type="text" maxlength="14" />
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data(){
    return {
      sender : "",
      messageText : "",
      FADE_TIME : 150,
      TYPING_TIMER_LENGTH : 400,
      COLORS : [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
      ],
      lastTypingTime : null,
      connected : false,
      typing :false
    }
  },
  methods:{
    setConnected(){
      this.connected = true;
    },
    addParticipantsMessage(data) {
      var message = '';
      if (data.numUsers === 1) {
        message += "there's 1 participant";
      } else {
        message += "there are " + data.numUsers + " participants";
      }
      this.log(message);
    },
    setUsername() {
      if(this.sender){
        $('.login.page').fadeOut();
        $('.chat.page').show();
        $('.login.page').off('click');
        $('.inputMessage').focus();
        this.$socket.emit('add_user', this.sender);
      }
    },
    // Sends a chat message
    sendMessage(){
      // Prevent markup from being injected into the message
      var message = this.cleanInput(this.messageText);
      // if there is a non-empty message and a socket connection
      if (message && this.connected) {
        this.addChatMessage({
          username: this.sender,
          message: message
        });
        // tell server to execute 'new message' and send along one parameter
        this.$socket.emit('new_message', message);
        this.messageText = "";
      }
    },
    // Adds the visual chat message to the message list
    addChatMessage(data, options) {
      // Don't fade the message in if there is an 'X was typing'
      var $typingMessages = this.getTypingMessages(data);
      options = options || {};
      if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
      }

      var $usernameDiv = $('<span class="username"/>')
        .text(data.username)
        .css('color', this.getUsernameColor(data.username));
      var $messageBodyDiv = $('<span class="messageBody">')
        .text(data.message);

      var typingClass = data.typing ? 'typing' : '';
      var $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);

      this.addMessageElement($messageDiv, options);
    },
    // Adds the visual chat typing message
    addChatTyping(data){
      data.typing = true;
      data.message = 'is typing';
      this.addChatMessage(data);
    },
    // Removes the visual chat typing message
    removeChatTyping(data){
      this.getTypingMessages(data).fadeOut(function () {
        $(this).remove();
      });
    },
    log(message, options) {
      console.log(options);
      if(typeof options == "String"){
        options = JSON.parse(options);
      }
      var $el = $('<li>').addClass('log').text(message);
      this.addMessageElement($el, options);
    },
    addMessageElement (el, options){
      var $el = $(el);

      // Setup default options
      if (!options) {
        options = {};
      }
      if (typeof options.fade === 'undefined') {
        options.fade = true;
      }
      if (typeof options.prepend === 'undefined') {
        options.prepend = false;
      }

      // Apply options
      if (options.fade) {
        $el.hide().fadeIn(this.FADE_TIME);
      }
      if (options.prepend) {
        $('.messages').prepend($el);
      } else {
        $('.messages').append($el);
      }
      $('.messages')[0].scrollTop = $('.messages')[0].scrollHeight;
    },
    cleanInput(input) {
      return $('<div/>').text(input).html();
    },
    updateTyping(){
      if (this.connected) {
        if (!this.typing) {
          this.typing = true;
          this.$socket.emit('typing');
        }
        this.lastTypingTime = (new Date()).getTime();

        setTimeout(() => {
          var typingTimer = (new Date()).getTime();
          var timeDiff = typingTimer - this.lastTypingTime;
          if (timeDiff >= this.TYPING_TIMER_LENGTH && this.typing) {
            this.$socket.emit('stop_typing');
            this.typing = false;
          }
        }, this.TYPING_TIMER_LENGTH);
      }
    },
    getTypingMessages(data) {
      return $('.typing.message').filter(function (i) {
        return $(this).data('username') === data.username;
      });
    },
    // Gets the color of a username through our hash function
    getUsernameColor(username){
      // Compute hash code
      var hash = 7;
      for (var i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + (hash << 5) - hash;
      }
      // Calculate color
      var index = Math.abs(hash % this.COLORS.length);
      return this.COLORS[index];
    },
    keyDown(event){
    // Auto-focus the current input when a key is typed
      if (!(event.ctrlKey || event.metaKey || event.altKey)) {
         $('.usernameInput').focus();
      }
      // When the client hits ENTER on their keyboard
      if (event.which === 13) {
        if (this.sender && this.messageText != "") {
          this.sendMessage();
          this.$socket.emit('stop_typing');
          this.typing = false;
        } else {
          this.setUsername();
        }
      }
    },
    reconnect(){
      if(this.sender)
        this.$socket.emit('add_user', this.sender);
    }
  },
  sockets : {
    login(data) {
      this.setConnected();
      // Display the welcome message
      var message = "Welcome to Socket.IO Chat – " + this.sender;
      // console.log(this);
      this.log(message,{prepend: true});
      this.addParticipantsMessage(data);
    },
    new_message(data) {
      this.addChatMessage(data);
    },
    user_joined(data){
      this.log(data.username + ' joined');
      this.addParticipantsMessage(data);
    },
    user_left(data) {
      this.log(data.username + ' left');
      this.addParticipantsMessage(data);
      this.removeChatTyping(data);
    },
    typing(data) {
      this.addChatTyping(data);
    },
    stop_typing(data) {
      this.removeChatTyping(data);
    },
    disconnect() {
      this.log('you have been disconnected');
    },
    reconnect() {
      this.log('you have been reconnected');
      this.reconnect();
    },
    reconnect_error() {
      this.log('attempt to reconnect has failed');
    },
    connect(){
      console.log('socket connected');
    }
  }
}

</script>

<style>
/* Fix user-agent */

* {
  box-sizing: border-box;
}

html {
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
}

html, input {
  font-family:
    "HelveticaNeue-Light",
    "Helvetica Neue Light",
    "Helvetica Neue",
    Helvetica,
    Arial,
    "Lucida Grande",
    sans-serif;
}

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

ul {
  list-style: none;
  word-wrap: break-word;
}

/* Pages */

.pages {
  height: 100%;
  margin: 0;
  padding: 0;
  width: 100%;
}

.page {
  height: 100%;
  position: absolute;
  width: 100%;
}

/* Login Page */

.login.page {
  background-color: #000;
}

.login.page .form {
  height: 100px;
  margin-top: -100px;
  position: absolute;

  text-align: center;
  top: 50%;
  width: 100%;
}

.login.page .form .usernameInput {
  background-color: transparent;
  border: none;
  border-bottom: 2px solid #fff;
  outline: none;
  padding-bottom: 15px;
  text-align: center;
  width: 400px;
}

.login.page .title {
  font-size: 200%;
}

.login.page .usernameInput {
  font-size: 200%;
  letter-spacing: 3px;
}

.login.page .title, .login.page .usernameInput {
  color: #fff;
  font-weight: 100;
}

/* Chat page */

.chat.page {
  display: none;
}

/* Font */

.messages {
  font-size: 150%;
}

.inputMessage {
  font-size: 100%;
}

.log {
  color: gray;
  font-size: 70%;
  margin: 5px;
  text-align: center;
}

/* Messages */

.chatArea {
  height: 100%;
  padding-bottom: 60px;
}

.messages {
  height: 100%;
  margin: 0;
  overflow-y: scroll;
  padding: 10px 20px 10px 20px;
}

.message.typing .messageBody {
  color: gray;
}

.username {
  font-weight: 700;
  overflow: hidden;
  padding-right: 15px;
  text-align: right;
}

/* Input */

.inputMessage {
  border: 10px solid #000;
  bottom: 0;
  height: 60px;
  left: 0;
  outline: none;
  padding-left: 10px;
  position: absolute;
  right: 0;
  width: 100%;
}
</style>
