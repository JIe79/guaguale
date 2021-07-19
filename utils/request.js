import { getCache, removeCache, slientLogin, $tips } from './common'
const Fly = require('../lib/fly')
const fly = new Fly()

const whileList = [
  "/user/mini_program_login",
  "/user/mini_program_qr_login",
]

//添加请求拦截器
fly.interceptors.request.use(async (request) => {
  const token = getCache('token')
  // 沒有token 且 請求地址不在白名單列表內
  if ((!token) && (!whileList.includes(request.url))) {

    // ### 靜默登錄 - start
    // fly.lock()
    // const isLoginSuccess = await slientLogin()
    // if (isLoginSuccess) {
    //   fly.unlock()
    // }
    // ### 靜默登錄 - end

    // ### 密碼登錄 - start
    await slientLogin().catch()
    // ### 密碼登錄 - end
  }
  //给所有请求添加自定义header
  if (getCache('token') && !fly.config.headers['X-Token']) {
    request.headers['X-Token'] = getCache('token')
  }
  // if (!request.headers['Content-Type']) {
  //   request.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8'
  // }
  return request
})

//添加响应拦截器
fly.interceptors.response.use(
  async (response) => {
    //只将请求结果的data字段返回
    let res = response.data
    console.log(res)
    if (!res.code) {
      return Promise.reject(res)
    }
    if (typeof res.data === 'undefined' || !res.data) {
      res.data = []
    }
    res.data['_msg'] = res.msg
    res.data['_code'] = res.code

    if (res.code === 401) {
      // ### 靜默登錄 - start
      // fly.lock()
      // removeCache('token')
      // const isLoginSuccess = await slientLogin()
      // if (isLoginSuccess) {
      //   fly.unlock()
      //   return fly.request(response.request)
      // }
      // ### 靜默登錄 - end

      // ### 密碼登錄 - start
      removeCache('token')
      await slientLogin().catch()
      // ### 密碼登錄 - end
    }

    return Promise.resolve(res)
  },
  (err) => {
    console.log(err)
    $tips('請求失敗，CODE: ' + err.status, 1500)
    //发生网络错误后会走到这里
    return Promise.resolve({
      code: err.status,
      msg: err.message
    })
  }
)

function setBaseUrl(url) {
  //配置请求基地址
  fly.config.baseURL = url
}

function getBaseUrl() {
  return fly.config.baseURL
}

function getHeaders() {
  return fly.config.headers || {}
}

export {
  fly,
  setBaseUrl,
  getBaseUrl,
  getHeaders
}