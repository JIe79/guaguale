import { fly, getBaseUrl } from './request'
import { $ } from './dom'

let app,
    is_logining = false;

function initApp(_app){
  if(!app) {
    if(_app){
      app = _app
    }else {
      app = getApp()
    }
  }
}

function isDevEnv() {
  if(!app) {
    throw new Error('app is not defined')
  }
  return app.globalData.platform === 'devtools'
}

// 檢查小程序是否有更新-僅正式版有效
function updateManager() {
  if (!wx.canIUse('getUpdateManager')) {
    $alert('微信版本過低，為不影響使用，請盡快升級')
  } else {
    const _updateManager = wx.getUpdateManager();
    _updateManager.onCheckForUpdate(res => {
      if (res.hasUpdate) {
        _updateManager.onUpdateReady(async () => {
          await $alert('新版本已準備好，是否重啟應用？', '更新提示')
          _updateManager.applyUpdate()
        })
      }
    })
  }
}

// 没拦截器的请求方法
let request = (method, url, data) => {
  return new Promise((resolve, reject)=>{
    let header = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
    }
    if (getCache('token')) {
      header.token = getCache('token')
    }
    // console.log(getBaseUrl())
    $showLoading()
    wx.request({
      url: getBaseUrl() + url,
      data,
      method,
      header,
      success: res => {
        if (res.data) {
          resolve(res.data)
        } else {
          resolve()
        }
      },
      fail: err => {
        $tips(err.msg)
        reject(err)
      },
      complete() {
        $hideLoading()
      }
    })
  })
}

// 緩存
function getCache(key) {
  return wx.getStorageSync(key)
}

function setCache(key, value) {
  wx.setStorageSync(key, value)
}

function removeCache(key) {
  wx.removeStorageSync(key)
}

/**
 * 通过get 方法请求url
 * @param {String} url url地址
 * @param {Object} data 要传的数据
 * @returns {Promise<object>} 直接返回data的內容
 */
const $get = (url, data) => {
  return new Promise((resolve, reject)=>{
    $showLoading()
    fly.get(url, data).then(res => {
      $hideLoading()
      resolve(res.data)
    }).catch(err => {
      // $hideLoading()
      $tips(err.msg)
    })
  })
}

/**
 * 通过post 方法请求url
 * @param {String} url url地址
 * @param {Object} data 要传的数据
 * @returns {Promise<object>} 直接返回data的內容
 */
const $post = (url, data) => {
  return new Promise((resolve, reject)=>{
    $showLoading()
    fly.post(url, data).then(res => {
      $hideLoading()
      resolve(res.data)
    }).catch(err => {
      // $hideLoading()
      $tips(err.msg)
    })
  })
}

/**
 * 上傳文件
 * @param {String} filePath file地址
 */
const $uploadFile = (filePath) => {
  return new Promise((resolve, reject) => {
    let token = getCache('token')
    wx.uploadFile({
      url: getBaseUrl() + '/ajax/upload',
      filePath,
      name: 'file',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'x-token': token,
      },
      timeout: 5000,
      success: res => {
        let _res = JSON.parse(res.data)
        if (_res.code === 1) {
          $tips('檔案上載成功')
          resolve(_res.data)
        } else {
          $tips(_res.msg)
          reject(_res)
        }
      },
      fail: err => {
        $tips('檔案上載失敗')
        reject(err)
      }
    })
  })
}

/**
 * 下載檔案
 * @param {String} path 路徑
 * @param {Object} header 頭部信息
 */
const $downFile = (path, header = {}) => {
  return new Promise((resolve, reject) => {
    $showLoading('檔案加載中')
    wx.downloadFile({
      url: path,
      header,
      success: res => {
        $hideLoading('檔案加載中')
        resolve(res.tempFilePath)
      }
    })
  })
}


function getWxcode() {
  return new Promise(resolve => {
    wx.login({
      success: res => {
        resolve(res.code)
      }
    })
  })
}

async function slientLogin(logined_navToUrl) {
  if (is_logining) return false
  is_logining = true
  if (getCache('isLogin')) {
    app.globalData.isLogin = true
    await getUserInfo()
    await getCdnUrl()
    return true
  }
  const code = await getWxcode()
  const url = '/user/mini_program_auto_login'
  const res = await request('POST', url, { code })
  console.log(res)
  if (res.code === 1) {
    const token = res.data.token
    setCache('token', token)
    setCache('isLogin', true)
    app.globalData.isLogin = true

    await getUserInfo()
    await getCdnUrl()

    is_logining = false
    return true
  } else if (res.code === 2) {
    is_logining = false
    app.globalData.wechat_user_id = res.data.wechat_user_id // 微信用户ID
    app.globalData.isLogin = false
    setCache('isLogin', false)
    navToLogin(logined_navToUrl)
    $tips('請登錄後再進行操作', 2500)
    return false
  } else {
    is_logining = false
    return false
  }
}

// 清除登錄信息
function removeLoginInfo() {
  app.globalData.token = ''
  app.globalData.userInfo = '',
  app.globalData.roles = '',
  app.globalData.isLogin = '',
  app.globalData.answer_list = '',
  removeCache('token')
  removeCache('userInfo')
  removeCache('roles')
  removeCache('isLogin')
  removeCache('answer_list')
}



/**
 * 获取用户信息
 * @param isShowLoading
 * @returns {Promise<boolean>}
 */
async function getUserInfo(isShowLoading = false) {
  isShowLoading && $showLoading()
  let userinfo = {}
  try {
    const res = await $get('/user/info')
    userinfo = res.userinfo
    app.globalData.userInfo = userinfo
    let roles_arr = userinfo.roles
    app.globalData.roles = roles_arr.length ? roles_arr[0] : ''
  
    setCache('userInfo', userinfo)
    if (roles_arr.length) {
      setCache('roles', roles_arr[0])
    }
  } catch (error) {
    isShowLoading && $hideLoading()
    
  }
  isShowLoading && $hideLoading()
  return userinfo
}

async function getLocal_userInfo(isRefresh = false) {
  let userinfo = getCache('userInfo')
  if (isRefresh || (!userinfo)) {
    userinfo = await getUserInfo()
  }
  return userinfo
}

async function getLocal_roles(isShowLoading = false) {
  let roles = getCache('roles')
  return roles
}

// 檢查是否登錄
async function check_isLogin(isShowLoading = false) {
  isShowLoading && $showLoading()
  let isLogin = app.globalData.isLogin
  if (!isLogin) {
    isLogin = getCache('isLogin')
    if (!isLogin) {
      isLogin = await slientLogin()
    }
  }
  isShowLoading && $hideLoading()
  return isLogin
}

// 獲取數碼遊蹤列表
async function getActivityList(is_refresh) {
  let activity_list = app.globalData.activity_list
  if ((!activity_list) || is_refresh) {
    try {
      const { rows } = await $get('/mini_program/digital_travel_list')
      app.globalData.activity_list = [...rows]
      activity_list = [...rows]
    } catch (error) {
      
    }
  }
  return activity_list
}

/**
 * 获取通用数据接口
*/
async function getCdnUrl() {
  let cdn_url = getCache('cdn_url')
  if(!cdn_url) {
    const data = await $get('/common/get_cdn_url').catch(err => console.log(err))
    cdn_url = data.cdn_url
    app.globalData.cdn_url = data.cdn_url
    setCache('cdn_url', data.cdn_url)
  }
  return cdn_url
}


/**
 * 获取记录下来的答题情况
 * @param {Number} id 数码游踪id
 */
function getLocal_answer(id) {
  if (typeof id == 'undefined') throw new Error('In function "getLocal_answer", No find "id" param')
  const answer_list = getCache('answer_list')
  if (typeof answer_list['id_'+id] !== 'undefined') {
    return answer_list['id_'+id]
  } else {
    return undefined
  }
}


/**
 * 记录答题情况
 * @param {Number} id 
 * @param {Number} index 
 * @param {Object} answer 
 */
function setLocal_answer(id, save_answer_obj) {
  if (typeof id == 'undefined') throw new Error('In function "setLocal_answer", No find "id" param')
  let answer_list = getCache('answer_list') || {}
  answer_list['id_'+id] = deepClone(save_answer_obj)
  setCache('answer_list', answer_list)
}


/**
 * 清除指定数码游踪的答题情况
 * @param {Number} id 
 */
function removeLocal_answer(id) {
  if (typeof id == 'undefined') throw new Error('In function "removeLocal_answer", No find "id" param')
  let answer_list = getCache('answer_list')
  answer_list['id_'+id] = ''
  delete answer_list['id_'+id]
  setCache('answer_list', answer_list)
}

/**
 * 跳轉到登錄頁
 * @param {String} logined_navToUrl 登錄成功後跳轉到
 */
function navToLogin(logined_navToUrl) {
  if (logined_navToUrl) {
    $nav(`/pages/login/login?backUrl=${logined_navToUrl}`)
  } else {
    $reNavAll(`/pages/login/login`)
  }
}

/**
 * 获取元素的自定义属性值
 * @param {*} e
 * @param {*} key data-key 中的key
 */
function $data(e, key) {
  if (e.currentTarget) {
    let res = e.currentTarget.dataset
    return key ? res[key] : res
  }
  if (e.target) {
    let res = e.target.dataset
    return key ? res[key] : res
  }
}

/**
 * 获取表单元素的值
 * @param {*} e
 */
function $value(e){
  return e.detail.value
}

/**
 * 显示loading
 * @param {String} title loading标题
 */
function $showLoading(title = '加载中') {
  wx.showLoading({
    title,
  })
}

/**
 * 隐藏loading
 */
function $hideLoading() {
  wx.hideLoading()
}


/**
 * 显示提示
 * @param {String} tips 提示文字
 * @param {Number} duration 显示时长
 * @returns {Promise<null>}
 */
function $tips(tips, duration = 1500) {
  return new Promise(resolve => {
    wx.showToast({
      title: tips,
      icon: 'none',
      duration,
      success: () => {
        resolve()
      }
    })
  })
}

/**
 * 显示成功提示
 * @param {String} tips 提示文字
 * @param {Number} duration 显示时长
 */
function $success(tips, duration = 1500) {
  return new Promise(resolve => {
    wx.showToast({
      title: tips,
      icon: 'success',
      duration,
      success: () => {
        resolve()
      }
    })
  })
}

/**
 * 显示确认框
 * @param {String} content 内容
 */
function $comfirm(content = '') {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: '提示',
      content,
      confirmText: '確定',
      success: res => {
        if (res.confirm) {
          console.log('用户点击确定')
          resolve()
        } else if (res.cancel) {
          console.log('用户点击取消')
          reject()
        }
      }
    })
  })
}


/**
 * 弹出提示对话框
 * @param {String} content 內容
 * @param {String} title 標題
 */
function $alert(content, title = '提示') {
  return new Promise(resolve => {
    wx.showModal({
        title,
        content,
        showCancel: false,
        // content: '',
        success(res) {
            if (res.confirm) {
              console.log('用户点击确定')
              resolve()
            }
        }
    });

  })
}


/**
 * 从本地相册选择图片或使用相机拍照。
 * @param {Number} count 最多可以选择的图片张数
 * @param {Array} sizeType 可以指定是原图还是压缩图，默认二者都有
 * @param {Array} sourceType 可以指定来源是相册还是相机，默认二者都有
 */
function $chooseImage(
  count = 9,
  sizeType = ['original', 'compressed'],
  sourceType = ['album', 'camera']
) {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count, // 默认9
      sizeType, // 可以指定是原图还是压缩图，默认二者都有['original', 'compressed'],
      sourceType, // 可以指定来源是相册还是相机，默认二者都有
      success: res => {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        resolve(res.tempFilePaths)
      }
    })
  })
}


/**
 * 从本地相册选择图片或使用相机拍照。
 * @param {Array} sizeType 可以指定是原图还是压缩图，默认二者都有
 * @param {Array} sourceType 可以指定来源是相册还是相机，默认二者都有
 * @param {Array} compressed 是否壓縮
 */
function $chooseVideo(
  sizeType = ['original', 'compressed'],
  sourceType = ['album', 'camera'],
  compressed = false,
) {
  return new Promise((resolve, reject) => {
    wx.chooseVideo({
      sizeType, // 可以指定是原图还是压缩图，默认二者都有['original', 'compressed'],
      sourceType, // 可以指定来源是相册还是相机，默认二者都有
      compressed,
      success: res => {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        resolve(res.tempFilePath)
      }
    })
  })
}


/**
 * 预览图片
 * 需要 在触发事件的元素上定义data-src data-field
 * 不用data-field的话，可以直接指定数组类型的list data-list
 * @param {Object} e
 */
function $previewImg(e) {
  // 获取当前图片的下标
  const { src: current, field, list } = this.$data(e)
  // 所有图片
  let urls = []
  if (field) {
    console.log(field)
    urls = this.data[field];
    console.log(urls)
  } else {
    urls = list.map(r => {
      if (typeof r === 'string') {
        return r
      } else if ('src' in r) {
        return r.src
      } else {
        throw new Error('绑定$previewImg方法的元素上，需要“data-field”属性，或者是“data-list”，来获取所有图片')
      }
    })
  }
  wx.previewImage({
    current, // 当前显示图片
    urls, // 所有图片
  })
}


/**
 * 改变表单的值
 * tips: 需要在组件上定义 data-field
 * 若綁定第二个值 例如:picker组件 需要在元素上定义 data-second_field data-list
 * @param {Object} e 事件对象
 */
function $inputValue(e) {
  const { field, second_field, list } = $data(e)
  if (!field) throw new Error('绑定$inputValue方法的元素上，需要一个“data-field”的属性')

  const value = $value(e)
  if (second_field) {
    if(!list) throw new Error('绑定$inputValue方法的元素上，“data-second_field属性搭配“data-list“属性使用')
    const id = list[value].id
    this.setData({
      [field]: value,
      [second_field]: id,
    })
  } else {
    this.setData({
      [field]: value
    })
  }
}

/**
 * 改变自定义事件的值
 * tips: 需要在元素上定义 data-field data-value
 * @param {Object} e 事件对象
 */
function $changeValue(e) {
  const { field, value } = $data(e)
  this.setData({
    [field]: value
  })
}


/**
 * 路由到xx-url地址
 * @param {String} url 地址
 */
function $nav(url) {
  wx.navigateTo({
    url,
  })
}

/**
 * 路由到xx-url地址Tab
 * @param {String} url 地址
 */
function $tab(url) {
  wx.switchTab({
    url,
  })
}

/**
 * 关闭所有页面，打开到应用内的某个页面
 * @param {String} url 地址
 */
function $reNavAll(url) {
  wx.reLaunch({
    url,
  })
}

/**
 * 关闭当前页面，跳转到应用内的某个页面
 * @param {String} url 地址
 */
function $reNav(url) {
  wx.redirectTo({
    url,
  })
}

/**
 * 关闭当前页面，返回上一页面或多级页面。
 * @param {Number} delta 返回的页面数，如果 delta 大于现有页面数，则返回到首页。
 */
function $navBack(delta = 1) {
  wx.navigateBack({
    delta
  })
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 获取当前日期
 */
const formatTime = time => {
  const date = time || new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const secondToMinute = second => {
  if (second === 0 || second === "0") {
    return '00′00″'
  }
  let _shi = parseInt(second/60/60)
  let _fen = parseInt(second/60)
  let _miao = parseInt(second%60)
  _shi = _shi < 10 ? "0" + _shi : _shi
  _fen = _fen < 10 ? "0" + _fen : _fen
  _miao = _miao < 10 ? "0" + _miao : _miao
  if (_shi > 0) {
    return `${ _shi }′${ _fen }′${ _miao }″`
  }
  return `${ _fen }′${ _miao }″`
}

/**
 * 洗牌函数
 * @param {Array} array 
 */
const shuffle = array => {
  var currentIndex = array.length,
      temporaryValue, 
      randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

/**
 * 深度复制对象（简易版）
 * @param source
 * @returns {[]|{}}
 */
function deepClone(source) {
  if (!source && typeof source !== 'object') {
      throw new Error('error arguments', 'deepClone')
  }
  const targetObj = source.constructor === Array ? [] : {}
  Object.keys(source).forEach(keys => {
      if (source[keys] && typeof source[keys] === 'object') {
          targetObj[keys] = deepClone(source[keys])
      } else {
          targetObj[keys] = source[keys]
      }
  })
  return targetObj
}


const isType = type => target => `[object ${type}]` === Object.prototype.toString.call(target)
const isArray = isType('Array')
const isObject = isType('Object')


/**
 * 将一维数组按指定对象键名转成数组对象
 * @param {Array} list 数组 
 * @param {String} key 键名
 * @returns {Object}
 */
const converArrToObjByKey = (list, key) => list.reduce((prev, cur) => {
  if (cur[key] in prev) {
      prev[cur[key]].push(cur)
  } else {
      prev[cur[key]] = [cur]
  }
  return prev
}, {})



/**
* 将数组对象转成一维数组
* @param {Object} obj {xx: ['',''], yy: ['','']}
* @returns {Array} ['','','','']
*/
const converArrObjToArr = obj => Object.values(obj).reduce((prev, cur) => {
  prev.push(...cur)
  return prev
}, [])


/**
 * 统一页面对象，封装了Page，添加了自定义方法
 * @param {*} option 同原本的Page参数
 */

function Router(option) {
  option.$ = $
  option.$get = $get
  option.$post = $post
  option.$uploadFile = $uploadFile
  option.$downFile = $downFile
  option.$data = $data
  option.$value = $value
  option.$showLoading = $showLoading
  option.$hideLoading = $hideLoading
  option.$tips = $tips
  option.$success = $success
  option.$comfirm = $comfirm
  option.$alert = $alert
  option.$chooseImage = $chooseImage
  option.$chooseVideo = $chooseVideo
  option.$previewImg = $previewImg
  option.$nav = $nav
  option.$tab = $tab
  option.$navBack = $navBack
  option.$reNavAll = $reNavAll
  option.$reNav = $reNav
  option.$inputValue = $inputValue
  option.$changeValue = $changeValue

  Page(option)
}

export {
  initApp,
  isDevEnv,
  updateManager,
  request,
  getCache,
  setCache,
  removeCache,
  $get,
  $post,
  $uploadFile,
  $downFile,
  slientLogin,
  removeLoginInfo,
  $data,
  $value,
  $showLoading,
  $hideLoading,
  $tips,
  $success,
  $comfirm,
  $alert,
  $chooseImage,
  $chooseVideo,
  $previewImg,
  $nav,
  $tab,
  $navBack,
  $inputValue,
  $changeValue,
  Router,
  // -------
  navToLogin,
  getUserInfo,
  getLocal_userInfo,
  getLocal_roles,
  getCdnUrl,
  getActivityList,
  getLocal_answer,
  setLocal_answer,
  removeLocal_answer,
  check_isLogin,
  formatTime,
  secondToMinute,
  shuffle,
  deepClone,
  isArray,
  isObject,
  converArrToObjByKey,
  converArrObjToArr,
}
