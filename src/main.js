// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import VueSocketio from 'vue-socket.io-extended'
import io from 'socket.io-client'
import BootstrapVue from 'bootstrap-vue/dist/bootstrap-vue.esm';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
window.$ = require('jquery')
Vue.use(BootstrapVue);
Vue.use(VueSocketio, io('http://localhost:3000'));
Vue.use(require('vue-moment'));

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  render: h => h(App)
})
