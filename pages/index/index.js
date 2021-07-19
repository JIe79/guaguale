const app = getApp()

let { Router } = app.require('./utils/common')
let { 
  getImageByUrl,
  getDomRect,
  getCanvas2D
} = app.require('./utils/dom')

Router({
  data:{
    visible_award: true,
    canvas_list: {},
    defaultCanvasName: 'awardCanvas',
    award_list: [
      {
        cover: 'http://39.108.119.140:8096/hanwen/images/g1.jpg',
        path: 'http://39.108.119.140:8096/hanwen/images/award1.jpg',
      },
      {
        cover: 'http://39.108.119.140:8096/hanwen/images/g2.jpg',
        path: 'http://39.108.119.140:8096/hanwen/images/award2.jpg',
      },
      {
        cover: 'http://39.108.119.140:8096/hanwen/images/g3.jpg',
        path: 'http://39.108.119.140:8096/hanwen/images/award3.jpg',
      },
      {
        cover: 'http://39.108.119.140:8096/hanwen/images/g4.jpg',
        path: 'http://39.108.119.140:8096/hanwen/images/award4.jpg',
      },
    ],
    is_first_chance: '',
    is_over: false,
  },

  onReady(){
    this.initAwardCanvas()
  },

  async initAwardCanvas() {
    const { award_list, canvas_list } = this.data 
    for (const key in award_list) {
      await this.createCanvas(key, award_list[key])
    }
    this.setData({
      visible_award: false,
      canvas_list,
    })
  },

  async createCanvas(index, item) {
    let { canvas_list, defaultCanvasName } = this.data,
        canvasIdName = defaultCanvasName + index,
        { width, height } = await getDomRect('#'+canvasIdName),
        canvas = await getCanvas2D('#'+canvasIdName),
        img_obj = await getImageByUrl(item.cover),
        ctx = canvas.getContext('2d')

    let img = canvas.createImage();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      ctx.globalCompositeOperation = "destination-out"
    }
    img.src = img_obj.path
    canvas_list[canvasIdName] = canvas
  },

  touchStart(e) {
    let { is_first_chance, is_over } = this.data
    const { canvas_list } = this.data
    const { canvas_name } = this.$data(e)
    if (!is_over && (!is_first_chance) || is_first_chance === canvas_name) {
      this.setData({
        is_first_chance: canvas_name,
      })
      const ctx = canvas_list[canvas_name].getContext('2d')
      const { x, y } = e.changedTouches[0]

      ctx.lineWidth = 20
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.save()

      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.restore()

    } else if (is_first_chance !== canvas_name) {
      this.$tips('已经没有机会了~')
      return
    }
  },

  touchMove(e) {
    const { canvas_list, is_first_chance, is_over } = this.data
    const { canvas_name } = this.$data(e)
    if (!is_over && is_first_chance === canvas_name) {
      const ctx = canvas_list[canvas_name].getContext('2d')
      const { x, y } = e.changedTouches[0]
      ctx.save()

      ctx.beginPath()
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.restore()
    }
  },

  touchEnd(e) {
    const { canvas_list, is_first_chance, is_over } = this.data
    const { canvas_name } = this.$data(e)
    if (!is_over && is_first_chance === canvas_name) {
      let flag = 0
      const canvas = canvas_list[canvas_name]
      const ctx = canvas.getContext('2d')
      let imageDate = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let allPx = imageDate.width * imageDate.height
      for (let i = 0; i < allPx; i++) {
        if(imageDate.data[i*4+3] === 0){
          flag++
        }
      }
      allPx /= 2
      if(flag >= allPx){
        let opacity = 0
        let res_animation_id = canvas.requestAnimationFrame(ani)
        function ani() {
          if (opacity >= 1) {
            canvas.cancelAnimationFrame(res_animation_id)
          } else {
            res_animation_id = canvas.requestAnimationFrame(ani)
          }
          ctx.fillStyle = `rgba(0,0,0,${opacity})`
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          opacity += 0.001
        }
        this.setData({
          is_over: true
        })
        console.log('刮开了')
      }
    }
  },

})