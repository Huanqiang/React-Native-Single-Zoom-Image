import React from 'react'
import PropTypes from 'prop-types'
import { View, Image, StyleSheet, Dimensions, PanResponder } from 'react-native'

class ZoomImage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isFromUri: false,
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      scale: 1,
      rotate: 0,
      isTouch: false
    }
    this.center = this.center.bind(this)
  }

  /*
	* center and zoom to fit the window
	* @ _width: the picture width
	* @ _height: the picture height
	* */
  center(_width, _height) {
    let { width, height } = this.props,
      rateImage = _width / _height,
      rateWindow = width / height,
      scale
    if (rateImage > rateWindow) {
      scale = width / _width
    } else {
      scale = height / _height
    }
    const top = (height - _height) / 2
    const left = (width - _width) / 2
    this.setState({
      left,
      top,
      width: _width,
      height: _height,
      scale,
      rotate: 0,
      rate: scale,
      isTouch: false
    })
  }

  componentWillMount() {
    // different image source deal in different way
    if (this.props.source.uri === undefined) {
      this.center(this.props.width, this.props.height)
    } else {
      Image.getSize(
        this.props.source,
        (width, height) => {
          this.center(width, height)
        },
        error => {
          console.error(error)
        }
      )
    }
    // gesture handler
    this._touches = [{}, {}]
    this._zoom = undefined
    this._panResponder = PanResponder.create({
      // be the responder
      onStartShouldSetResponder: (evt, gestureState) => true,
      onStartShouldSetResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // touche start
      onPanResponderGrant: (evt, gestureState) => {
        this.props.onHandleTouch && this.props.onHandleTouch(true)
        this.setState({
          isTouch: true
        })
        // mark touches info
        for (let x in this._touches) {
          if (evt.nativeEvent.touches[x]) {
            this._touches[x].x = evt.nativeEvent.touches[x].pageX
            this._touches[x].y = evt.nativeEvent.touches[x].pageY
            this._touches[x].identifier = evt.nativeEvent.touches[x].identifier
          }
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length === 1) {
          // one finger, moving
          // reset zoom msg
          // todo possibly the lest finger is not the first touches,deal with it
          if (this._touches[0].identifier === undefined) {
            //haven marked before, mark and return
            for (let x in this._touches) {
              if (evt.nativeEvent.touches[x]) {
                this._touches[x].x = evt.nativeEvent.touches[x].pageX
                this._touches[x].y = evt.nativeEvent.touches[x].pageY
                this._touches[x].identifier = evt.nativeEvent.touches[x].identifier
              }
            }
            return false
          } else {
            // compute the distance has touch moved
            let moveX = evt.nativeEvent.touches[0].pageX - this._touches[0].x
            let moveY = evt.nativeEvent.touches[0].pageY - this._touches[0].y
            // set the state
            this.state.left += moveX
            this.state.top += moveY
            this.setState({
              left: this.state.left,
              top: this.state.top
            })
            // mark
            for (let x in this._touches) {
              if (evt.nativeEvent.touches[x]) {
                this._touches[x].x = evt.nativeEvent.touches[x].pageX
                this._touches[x].y = evt.nativeEvent.touches[x].pageY
                this._touches[x].identifier = evt.nativeEvent.touches[x].identifier
              }
            }
          }
        } else {
          // compute the zoom center
          const x = (evt.nativeEvent.touches[0].pageX + evt.nativeEvent.touches[1].pageX) / 2
          const y = (evt.nativeEvent.touches[0].pageY + evt.nativeEvent.touches[1].pageY) / 2
          if (this._zoom === undefined) {
            // mark the zoom center
            this._zoom = {
              rotate: this.state.rotate,
              countAngle: this.countAngle(x, y, evt.nativeEvent.touches[0].pageX, evt.nativeEvent.touches[0].pageY),
              x,
              y,
              distance: Math.sqrt(
                Math.pow(evt.nativeEvent.touches[0].pageX - evt.nativeEvent.touches[1].pageX, 2) +
                  Math.pow(evt.nativeEvent.touches[0].pageY - evt.nativeEvent.touches[1].pageY, 2)
              )
            }
            return false
          } else {
            // compute distance
            let distanceTemp = Math.sqrt(
              Math.pow(evt.nativeEvent.touches[0].pageX - evt.nativeEvent.touches[1].pageX, 2) +
                Math.pow(evt.nativeEvent.touches[0].pageY - evt.nativeEvent.touches[1].pageY, 2)
            )
            let distanceAdd = distanceTemp - this._zoom.distance
            let distanceScale = distanceAdd / this._zoom.distance

            // compute scale
            let scaleAdd = 0
            if (distanceScale !== 0) {
              scaleAdd = this.state.scale * distanceScale
            }
            let setScale = this.state.scale + scaleAdd

            // 计算旋转的弧度 利用正切的方法求
            const countAngle = this.countAngle(
              this._zoom.x,
              this._zoom.y,
              evt.nativeEvent.touches[0].pageX,
              evt.nativeEvent.touches[0].pageY
            )
            const rotate = countAngle - this._zoom.countAngle + this._zoom.rotate

            // compute left & top for centering the zoom point
            // const left =
            //   (setScale / this.state.scale) * (0.5 * this.state.width + this.state.left - this._zoom.x) -
            //   0.5 * this.state.width +
            //   this._zoom.x
            // const top =
            //   (setScale / this.state.scale) * (0.5 * this.state.height + this.state.top - this._zoom.y) -
            //   0.5 * this.state.height +
            //   this._zoom.y

            this._zoom.distance = distanceTemp

            this.setState({
              scale: setScale,
              rotate: rotate
              // 这里暂时注释掉，使之以两点之间为中心扩展
              // left,
              // top
            })
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        this.props.onHandleTouch && this.props.onHandleTouch(false)
        this.setState({
          isTouch: false
        })
        // reset
        this._touches = [{}, {}]
        this._zoom = undefined
      }
    })
  }

  countAngle = (ox, oy, x, y) => {
    const diffX = x - ox
    const diffY = y - oy
    const to = Math.abs(diffX / diffY)
    const angle = (Math.atan(to) / (2 * Math.PI)) * 360
    if (diffX < 0 && diffY < 0) {
      return -angle // 第四象限
    } else if (diffX > 0 && diffY < 0) {
      return angle // 第一象限
    } else if (diffX > 0 && diffY > 0) {
      return 180 - angle // 第二象限
    } else {
      return -(180 - angle) // 第三象限
    }
  }

  render() {
    const { width = 300, height = 300, source, style, canZoom = true, canRotate = true, children } = this.props

    // 判断是能够伸缩、旋转
    const dynamicTransforms = []
    if (canRotate) {
      dynamicTransforms.push({ rotate: `${this.state.rotate}deg` })
    }
    if (canZoom) {
      dynamicTransforms.push({ scale: this.state.scale })
    }

    return (
      <View
        style={{
          width,
          height,
          backgroundColor: 'transparent',
          ...style
        }}
      >
        <Image
          source={source}
          // resizeMode="contain"
          style={{
            position: 'absolute',
            width: this.state.width,
            height: this.state.height,
            left: this.state.left,
            top: this.state.top,
            transform: dynamicTransforms
          }}
          {...this._panResponder.panHandlers}
        />
        {children}
      </View>
    )
  }
}

ZoomImage.propTypes = {
  source: PropTypes.any,
  width: PropTypes.number,
  height: PropTypes.number,
  style: PropTypes.object,
  canRotate: PropTypes.bool,
  canZoom: PropTypes.bool,
  onHandleTouch: PropTypes.func
}

ZoomImage.defaultProps = {
  width: 300,
  height: 300,
  canRotate: true,
  canZoom: true,
  onHandleTouch: isTouch => {}
}

export default ZoomImage
