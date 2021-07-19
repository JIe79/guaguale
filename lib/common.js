import wxp from "./wxp"
import {request} from "./request";

// const app = getApp()
let app;

function initApp(_app){
    if(!app) {
        if(_app){
            app = _app
        }else {
            app = getApp()
        }
    }
}

/**
 * 成功提示
 * @param msg
 * @param icon
 * @param duration
 */
function success(msg, icon, duration) {
    wx.showToast({
        title: msg,
        icon: typeof icon == "undefined" ? 'success' : icon,
        duration: typeof duration == "undefined" ? 2000 : duration
    });
}

async function checkLogin(autoLogin) {
    if (app.globalData.isLogin) {
        return true
    } else {
        let token = wx.getStorageSync('token')
        if (token) {
            app.globalData.token = token
            wx.setStorageSync('token', token)
            await getUserInfo(false)
            return true
        } else {
            let error = 0;
            const data = await wechatLogin().catch((err) => {
                console.log(err)
                if(err.body.code === 2){
                    wx.setStorageSync('wechatToken', err.body.data.wechatToken)
                    app.globalData.wechatToken = err.body.data.wechatToken
                }
                // hideLoading()
                error++
                if(autoLogin) {
                    goToLogin()
                }
            })
            if(data){
                app.globalData.userInfo = data.userInfo
                app.globalData.isLogin = true
                app.globalData.token = data.token
                wx.setStorageSync('token', data.token)
                app.globalData.wechatToken = data.wechatToken
                wx.setStorageSync('wechatToken', data.wechatToken)
                if(autoLogin) {
                    loginCallback(data.userInfo)
                }
            }
            // const data = await wechatLogin().catch((err) => {
            // })
            // if (data) {
            // }
            return error <= 0
        }
    }
}

/**
 * 获取用户信息
 * @param isShowLoading
 * @returns {Promise<boolean>}
 */
async function getUserInfo(isShowLoading) {
    if (isShowLoading === true) {
        showLoading()
    }
    const data = await request.get('user/info').catch((err) => {
        if (isShowLoading === true) {
            hideLoading()
        }
    })

    if (isShowLoading === true) {
        hideLoading()
    }

    if (data) {
        app.globalData.userInfo = data.userInfo
        app.globalData.isLogin = true
        app.globalData.token = data.token
        wx.setStorageSync('token', data.token)
        await loginCallback(data.userInfo)
        return true
    } else {
        return false
    }
}

/**
 * 调用后台微信小程序登入接口
 * @returns {Promise<unknown>}
 */
async function wechatLogin() {
    await getWechatData()
    if (app.globalData.wechatCode) {
        const data = await request.post('user/wechatMiniProgramLogin', {
            code: app.globalData.wechatCode,
            authData: JSON.stringify(app.globalData.wechatAuthData)
        }).catch((err) => {
            return Promise.reject(err)
        })
        return Promise.resolve(data)
    } else {
        return await Promise.reject()
    }
}

/**
 * 调用微信自带登入接口
 *
 * @returns {Promise<void>}
 */
async function getWechatData() {
    const wechatLoginData = await wxp.login()
    if (wechatLoginData) {
        app.globalData.wechatCode = wechatLoginData.code
    }
    const wechatAuthData = await wxp.getUserInfo()
    if (wechatAuthData) {
        app.globalData.wechatAuthData = wechatAuthData
    }
}

function loginCallback(userInfo) {
    wx.removeStorage({
        key: 'autoLogin',
    })
    if (userInfo.status === 'normal') {
        let returnUrl = wx.getStorageSync('returnUrl')
        if(returnUrl){
            wx.removeStorage({key:'returnUrl'})
            wx.reLaunch({
                url: returnUrl
            });
        }else {
            //处理登入后页面跳转
            var pages = getCurrentPages();
            // console.log(pages);
            let goBackPageCount = 0;
            let currentPage = pages[pages.length - 1];
            if(currentPage.route.indexOf('login') >= 0 || currentPage.route.indexOf('register') >= 0){
                goBackPageCount = 1;
            }
            if (pages.length > goBackPageCount) {
                var prevPage = pages[pages.length - (goBackPageCount + 1)];
                if(currentPage.route === prevPage.route){
                    prevPage.options.is_back = true;
                    prevPage.onLoad(prevPage.options);
                }else {
                    wx.navigateBack({
                        success: function (e) {
                            // showLoading();
                            // setTimeout(function(){
                            // hideLoading();
                            prevPage.options.is_back = true;
                            prevPage.onLoad(prevPage.options);
                            // },500);
                        },
                        fail: function () {
                            wx.reLaunch({
                                url: '/pages/index/index'
                            });
                        }
                    });
                }
            } else {
                wx.reLaunch({
                    url: '/pages/index/index'
                });
            }
        }
    } else if (userInfo.status === 'disabled') {
        alert("您的账号已被禁用，请选择其他账户登录", function () {
            //执行登出
            logout();
        })
    }
}

/**
 * 错误提示
 * @param msg
 * @param icon
 * @param duration
 */
function error(msg, icon, duration) {
    wx.showToast({
        title: msg,
        icon: typeof icon == "undefined" ? 'none' : icon,
        duration: typeof duration == "undefined" ? 2000 : duration
    });
}

/**
 * 弹出提示对话框
 * @param title
 * @param confirmCallback
 */
function alert(title, confirmCallback) {
    wx.showModal({
        title: title,
        showCancel: false,
        // content: '',
        success(res) {
            if (res.confirm) {
                confirmCallback && confirmCallback();
                console.log('用户点击确定')
            }
        }
    });
}

/**
 * 解决iOS小程序自动下拉刷新问题
 * @param obj
 * @param options
 */
function iOSPullDownRefresh(obj, options) {
    var platform = app.globalData.platform;
    if (options.is_back && platform === 'ios') {
        obj.onPullDownRefresh && obj.onPullDownRefresh();
    }
}

/**
 * 弹出确认提示框
 * @param title
 * @param content
 * @param confirmCallback
 * @param cancelCallback
 */
function confirm(title, content, confirmCallback, cancelCallback) {
    wx.showModal({
        title: title,
        content: content,
        success(res) {
            if (res.confirm) {
                confirmCallback && confirmCallback();
                console.log('用户点击确定')
            } else if (res.cancel) {
                cancelCallback && cancelCallback();
                console.log('用户点击取消')
            }
        }
    })
}

/**
 * 登出用户
 * @returns {Promise<void>}
 */
async function logout() {
    // if (app.globalData.wechatToken === "") {
    //     const wechatLoginData = await wechatLogin()
    //     wx.setStorage({
    //         key: "wechatToken",
    //         data: undefined,
    //         success: function () {
    //             app.globalData.wechatToken = "";
    //         }
    //     });
    // }
    await request.get("user/logout")
    app.globalData.isLogin = false;
    app.globalData.userInfo = {};
    wx.removeStorage({
        key: "token",
        success: function () {
            app.globalData.token = "";
        }
    });
    wx.removeStorage({
        key: "wechat_token",
        data: "",
        success: function () {
            app.globalData.wechatToken = "";
        }
    });
    wx.reLaunch({
        url: '/pages/index/index',
    });
}

/**
 * 初始化会员信息
 * @returns {Promise<boolean>}
 */
async function initUserInfo() {
    let token = wx.getStorageSync('token')
    let wechatToken = wx.getStorageSync('wechatToken')
    let result = false
    if (token && wechatToken && Object.keys(app.globalData.userInfo).length <= 0) {
        app.globalData.token = token
        app.globalData.wechatToken = wechatToken
        result = await getUserInfo(false)
    } else if (token && wechatToken && Object.keys(app.globalData.userInfo).length > 0){
        result = true
    }
    return result
}

/**
 * 显示加载界面
 * @param title
 */
function showLoading(title) {
    wx.showLoading({
        title: title ? title : '加载中',
        mask: true
    });
}

/**
 * 隐藏加载界面
 */
function hideLoading() {
    wx.hideLoading();
}

/**
 * 重置登入数据
 */
function resetLoginData() {
    app.globalData.token = "";
    app.globalData.userInfo = {};
    app.globalData.isLogin = false;
}

function resetTokenStorage(){
    wx.removeStorage({
        key: 'token'
    })
    wx.removeStorage({
        key: 'wechatToken'
    })
}

/**
 * 跳转至登入页
 * @param returnUrl
 */
function goToLogin(returnUrl = '') {
    resetLoginData()
    var pages = getCurrentPages();
    var current_page = pages[pages.length - 1];
    if(returnUrl) {
        wx.setStorageSync('returnUrl', returnUrl);
    }
    if (current_page.route != "pages/login/login") {
        wx.navigateTo({
            url: '/pages/login/login',
        });
    }
}

/**
 * 获取请求头部
 * @returns {{}}
 */
function getHeader() {
    let result = {};
    let token = wx.getStorageSync('token')
    if (token) {
        result['X-Auth-Token'] = token
    }
    let wechatToken = wx.getStorageSync('wechatToken')
    if (wechatToken) {
        result['X-Auth-Wechat-Token'] = wechatToken
    }
    return result
}

/**
 * 合并对象（仅保留目标数组字段）
 * @param target
 * @param targetDefault
 * @param source
 * @returns {*}
 */
function objectAssign(target, targetDefault, source){
    const _source = deepClone(source)
    Object.keys(_source).forEach(keys =>{
        if(!(keys in targetDefault)){
            delete _source[keys]
        }
    })
    return Object.assign(target, targetDefault, _source)
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

function accDiv(arg1, arg2) {
    let t1=0,t2=0,r1,r2
    try{t1=arg1.toString().split(".")[1].length}catch(e){}
    try{t2=arg2.toString().split(".")[1].length}catch(e){}
    r1=Number(arg1.toString().replace(".",""))
    r2=Number(arg2.toString().replace(".",""))
    return (r1/r2)*Math.pow(10,t2-t1)
}

function accMul(arg1, arg2) {
    var m=0,s1=arg1.toString(),s2=arg2.toString();
    try{m+=s1.split(".")[1].length}catch(e){}
    try{m+=s2.split(".")[1].length}catch(e){}
    return Number(s1.replace(".",""))*Number(s2.replace(".",""))/Math.pow(10,m)
}

function accSub(arg1, arg2) {
    var r1, r2, m, n;
    try {
        r1 = arg1.toString().split(".")[1].length;
    }
    catch (e) {
        r1 = 0;
    }
    try {
        r2 = arg2.toString().split(".")[1].length;
    }
    catch (e) {
        r2 = 0;
    }
    m = Math.pow(10, Math.max(r1, r2)); //last modify by deeka //动态控制精度长度
    n = (r1 >= r2) ? r1 : r2;
    return ((arg1 * m - arg2 * m) / m).toFixed(n);
}

function getParams(queryStr) {
    return queryStr.split('&').reduce((pre, cur) => {
        const [key, val] = cur.split('=')
        pre[key] = decodeURIComponent(val)
        return pre
    }, {})
}


export {getHeader, goToLogin, initUserInfo, showLoading, hideLoading, checkLogin, success, error, loginCallback, initApp, objectAssign, logout, confirm, accDiv, accMul, resetTokenStorage, accSub, getParams}
