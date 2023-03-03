/**
 * 设置画布以及雨滴的一些反弹碰撞属性
 * @param canvasid 画布id
 * @param sourceid 背景图片id
 * @param width 渲染的宽度
 * @param height 渲染的高度
 * @param opacity 玻璃透明度
 * @param blur 模糊半径
 */
function RainyDay(canvasid, sourceid, width, height, opacity, blur) {
	this.canvasid = canvasid;
	this.canvas = document.getElementById(canvasid);

	this.sourceid = sourceid;
	this.img = document.getElementById(sourceid);

	// 绘制和模糊背景图像
	this.prepareBackground(blur ? blur : 20, width, height);
	this.w = this.canvas.width;
	this.h = this.canvas.height;

	// 创建玻璃画布
	this.prepareGlass(opacity ? opacity : 1);

	// 假设默认反射机制
	this.reflection = this.REFLECTION_MINIATURE;

	// 假设默认跟踪机制（雨滴掉落轨迹）
	this.trail = this.TRAIL_DROPS;

	// 假设默认重力
	this.gravity = this.GRAVITY_NON_LINEAR;

	// 水滴大小阈值的重力算法
	this.VARIABLE_GRAVITY_THRESHOLD = 3;

	// 重力角
	this.VARIABLE_GRAVITY_ANGLE = Math.PI / 2;

	// 帧/秒动画速度
	this.VARIABLE_FPS = 25;

	// 当没有使用REFLECTION_NONE时，上下文填充样式
	this.VARIABLE_FILL_STYLE = '#8ED6FF';

	// 默认启用碰撞
	this.VARIABLE_COLLISIONS = false;

	// 假设默认的碰撞算法
	this.collision = this.COLLISION_SIMPLE;
}

/**
 * 创建用于渲染雨滴反射的辅助画布
 */
RainyDay.prototype.prepareReflections = function() {
	// 创建新画布
	this.reflected = document.createElement('canvas');
	this.reflected.width = this.canvas.width;
	this.reflected.height = this.canvas.height;

	var ctx = this.reflected.getContext('2d');

	// 旋转180度
	ctx.translate(this.reflected.width / 2, this.reflected.height / 2);
	ctx.rotate(Math.PI);

	// 绘制图像
	ctx.drawImage(this.img, -this.reflected.width / 2, -this.reflected.height / 2, this.reflected.width, this.reflected.height);
};

/**
 * 创建玻璃画布，并将其直接放置在主画布上。
 * @param opacity 玻璃画布的透明度
 */
RainyDay.prototype.prepareGlass = function(opacity) {
	// 创建玻璃画布
	this.glass = document.createElement('canvas');
	this.glass.width = this.canvas.width;
	this.glass.height = this.canvas.height;
	// 玻璃画布的样式
	this.glass.style.position = "absolute";
	this.glass.style.top = this.canvas.offsetTop;
	this.glass.style.left = this.canvas.offsetLeft;
	this.glass.style.zIndex = this.canvas.style.zIndex + 100;
	// 放在html中
	this.canvas.parentNode.appendChild(this.glass);
	this.context = this.glass.getContext('2d');
	// 设置透明度
	this.glass.style.opacity = opacity;
};

/**
 * 创建一个具有给定属性的新预设对象
 * @param min 雨滴下落的最小大小
 * @param base 随机液滴大小的基本值
 * @param quan 选择此预设的概率(必须在0和1之间)
 * @returns 用给定的属性显示对象
 */
RainyDay.prototype.preset = function(min, base, quan) {
	return {
		"min": min,
		"base": base,
		"quan": quan
	}
};

/**
 * 启动雨渲染
 * @param presets 要应用的预设列表
 * @param speed 动画的速度(如果没有提供或将生成0静态图像)
 */
RainyDay.prototype.rain = function(presets, speed) {
	// 雨滴掉落的反射画布
	if (this.reflection != this.REFLECTION_NONE) {
		// 创建用于渲染雨滴反射的辅助画布
		this.prepareReflections();
	}

	// 速度大于0继续移动
	if (speed > 0) {
		// 动画
		this.presets = presets;

		// 移动的xy轴位置
		this.PRIVATE_GRAVITY_FORCE_FACTOR_Y = (this.VARIABLE_FPS * 0.005) / 25;
		this.PRIVATE_GRAVITY_FORCE_FACTOR_X = ((Math.PI / 2) - this.VARIABLE_GRAVITY_ANGLE) * (this.VARIABLE_FPS * 0.005) / 50;

		// 准备重力矩阵
		// 如果碰撞
		if (this.VARIABLE_COLLISIONS) {

			// 计算最大下落半径以建立重力矩阵分辨率
			var maxDropRadius = 0;
			for (var i = 0; i < presets.length; i++) {
				if (presets[i].base + presets[i].min > maxDropRadius) {
					maxDropRadius = Math.floor(presets[i].base + presets[i].min);
				}
			}

			if (maxDropRadius > 0) {
				// initialize the gravity matrix
				var mwi = Math.ceil(this.w / maxDropRadius);
				var mhi = Math.ceil(this.h / maxDropRadius);
				this.matrix = new CollisionMatrix(mwi, mhi, maxDropRadius);
			} else {
				this.VARIABLE_COLLISIONS = false;
			}
		}

		// 每几秒移动一次
		setInterval(
			(function(self) {
				return function() {
					var random = Math.random();
					// select matching preset
					var preset;
					for (var i = 0; i < presets.length; i++) {
						if (random < presets[i].quan) {
							preset = presets[i];
							break;
						}
					}
					if (preset) {
						// 设置移动后的雨滴
						self.putDrop(new Drop(self, Math.random() * self.w, Math.random() * self.h, preset.min, preset.base));
					}
				}
			})(this),
			speed
		);
	} else {
		// 速度为0，静态样式
		for (var i = 0; i < presets.length; i++) {
			var preset = presets[i];
			for (var c = 0; c < preset.quan; ++c) {
				this.putDrop(new Drop(this, Math.random() * this.w, Math.random() * this.h, preset.min, preset.base));
			}
		}
	}
};
/**
 * 添加雨滴掉落动画
 * @param drop 删除要添加到动画中的对象
 */
RainyDay.prototype.putDrop = function(drop) {
	drop.draw();
	if (this.gravity && drop.r1 > this.VARIABLE_GRAVITY_THRESHOLD) {

		// 如果碰撞
		if (this.VARIABLE_COLLISIONS) {
			// 更新重力矩阵
			this.matrix.update(drop);
		}

		drop.animate();
	}
};
/**
 * 不完全近似圆的形状——雨滴样式
 * @param iterations 应用于大小近似算法的迭代次数
 * @returns 近似圆形状的点列表
 */
RainyDay.prototype.getLinepoints = function(iterations) {
	var pointList = {};
	pointList.first = {
		x: 0,
		y: 1
	};
	var lastPoint = {
		x: 1,
		y: 1
	}
	var minY = 1;
	var maxY = 1;
	var point;
	var nextPoint;
	var dx, newX, newY;

	pointList.first.next = lastPoint;
	for (var i = 0; i < iterations; i++) {
		point = pointList.first;
		while (point.next != null) {
			nextPoint = point.next;

			dx = nextPoint.x - point.x;
			newX = 0.5 * (point.x + nextPoint.x);
			newY = 0.5 * (point.y + nextPoint.y);
			newY += dx * (Math.random() * 2 - 1);

			var newPoint = {
				x: newX,
				y: newY
			};

			//min, max
			if (newY < minY) {
				minY = newY;
			} else if (newY > maxY) {
				maxY = newY;
			}

			//put between points
			newPoint.next = nextPoint;
			point.next = newPoint;

			point = nextPoint;
		}
	}

	//normalize to values between 0 and 1
	if (maxY != minY) {
		var normalizeRate = 1 / (maxY - minY);
		point = pointList.first;
		while (point != null) {
			point.y = normalizeRate * (point.y - minY);
			point = point.next;
		}
	} else {
		point = pointList.first;
		while (point != null) {
			point.y = 1;
			point = point.next;
		}
	}

	return pointList;
};

/**
 * 雨滴掉落函数
 * @param rainyday 父对象的引用
 * @param centerX 这个落点中心的X位置
 * @param centerY 这个落点中心的Y位置
 * @param min 水滴的最小尺寸
 * @param base 随机液滴大小的基本值
 */

function Drop(rainyday, centerX, centerY, min, base) {
	this.x = Math.floor(centerX);
	this.y = Math.floor(centerY);
	this.r1 = (Math.random() * base) + min;
	this.rainyday = rainyday;
	var iterations = 4;
	this.r2 = 0.8 * this.r1;
	// 雨滴形状
	this.linepoints = rainyday.getLinepoints(iterations);
	// 画笔
	this.context = rainyday.context;
	// 雨滴反射
	this.reflection = rainyday.reflected;
}

/**
 * 在当前位置的画布上绘制雨滴
 */
Drop.prototype.draw = function() {
	var phase = 0;
	var point;
	var rad, theta;
	var x0, y0;

	this.context.save();
	this.context.beginPath();
	point = this.linepoints.first;
	theta = phase;
	rad = this.r2 + 0.5 * Math.random() * (this.r2 - this.r1);
	x0 = this.x + rad * Math.cos(theta);
	y0 = this.y + rad * Math.sin(theta);
	this.context.lineTo(x0, y0);
	while (point.next != null) {
		point = point.next;
		theta = (Math.PI * 2 * point.x) + phase;
		rad = this.r2 + 0.5 * Math.random() * (this.r2 - this.r1);
		x0 = this.x + rad * Math.cos(theta);
		y0 = this.y + rad * Math.sin(theta);
		this.context.lineTo(x0, y0);
	}

	this.context.clip();

	if (this.rainyday.reflection) {
		this.rainyday.reflection(this);
	}

	this.context.restore();
};

/**
 * 清楚雨滴轨迹
 * @param force 强制停止
 * @returns 如果动画停止返回true
 */
Drop.prototype.clear = function(force) {
	// 清除画布
	this.context.clearRect(this.x - this.r1 - 1, this.y - this.r1 - 1, 2 * this.r1 + 2, 2 * this.r1 + 2);
	if (force) {
		// 清除定时器，该雨滴停止下落
		clearInterval(this.intid);
		return true;
	}
	if (this.y - this.r1 > this.rainyday.h) {
		// 越过底部边缘，停止线程
		clearInterval(this.intid);
		return true;
	}
	if ((this.x - this.r1 > this.rainyday.w) || (this.x + this.r1 < 0)) {
		// 在右侧或左侧边缘，停止线程
		clearInterval(this.intid);
		return true;
	}
	return false;
};

/**
 * 根据重力将雨滴移动到一个新的位置。
 */
Drop.prototype.animate = function() {
	this.intid = setInterval(
		(function(self) {
			return function() {
				var stopped = self.rainyday.gravity(self);
				if (!stopped && self.rainyday.trail) {
					self.rainyday.trail(self);
				}
				if (self.rainyday.VARIABLE_COLLISIONS) {
					var collision = self.rainyday.matrix.update(self, stopped);
					if (collision) {
						self.rainyday.collision(self, collision.drop);
					}
				}
			}
		})(this),
		Math.floor(1000 / this.rainyday.VARIABLE_FPS)
	);
};

/**
 * TRAIL功能:没有任何痕迹
 * @param drop raindrop object
 */
RainyDay.prototype.TRAIL_NONE = function(drop) {
	// nothing going on here
};

/**
 * TRAIL功能:小水滴轨迹(默认)
 * @param drop raindrop object
 */
RainyDay.prototype.TRAIL_DROPS = function(drop) {
	if (!drop.trail_y || drop.y - drop.trail_y >= Math.random() * 10 * drop.r1) {
		drop.trail_y = drop.y;
		this.putDrop(new Drop(this, drop.x, drop.y - drop.r1 - 5, 0, Math.ceil(drop.r1 / 5)));
	}
};
// ------------------------------------------------------------------------------------------------
/**
 * GRAVITY function: no gravity at all
 * @param drop raindrop object
 * @returns true if the animation is stopped
 */
RainyDay.prototype.GRAVITY_NONE = function(drop) {
	return true;
};

/**
 * GRAVITY function: linear gravity
 * @param drop raindrop object
 * @returns true if the animation is stopped
 */
RainyDay.prototype.GRAVITY_LINEAR = function(drop) {
	if (drop.clear()) {
		return true;
	}

	if (drop.yspeed) {
		drop.yspeed += this.PRIVATE_GRAVITY_FORCE_FACTOR_Y * Math.floor(drop.r1);
		drop.xspeed += this.PRIVATE_GRAVITY_FORCE_FACTOR_X * Math.floor(drop.r1);
	} else {
		drop.yspeed = this.PRIVATE_GRAVITY_FORCE_FACTOR_Y;
		drop.xspeed = this.PRIVATE_GRAVITY_FORCE_FACTOR_X;
	}

	drop.y += drop.yspeed;
	drop.draw();
	return false;
};

/**
 * 重力函数:非线性重力(默认)
 * @param drop 雨滴对象
 * @returns 如果动画停止，则返回false
 */
RainyDay.prototype.GRAVITY_NON_LINEAR = function(drop) {
	if (drop.clear()) {
		return true;
	}

	// 雨滴滑落速度
	if (!drop.seed || drop.seed < 0) {
		drop.seed = Math.floor(Math.random() * this.VARIABLE_FPS);
		drop.skipping = drop.skipping == false ? true : false;
		drop.slowing = true;
	}

	// 速度变缓
	drop.seed--;

	// 修改xy方向的速度
	if (drop.yspeed) {
		if (drop.slowing) {
			drop.yspeed /= 1.1;
			drop.xspeed /= 1.1;
			if (drop.yspeed < this.PRIVATE_GRAVITY_FORCE_FACTOR_Y) {
				drop.slowing = false;
			}
		} else if (drop.skipping) {
			drop.yspeed = this.PRIVATE_GRAVITY_FORCE_FACTOR_Y;
			drop.xspeed = this.PRIVATE_GRAVITY_FORCE_FACTOR_X;
		} else {
			drop.yspeed += 10 * this.PRIVATE_GRAVITY_FORCE_FACTOR_Y * Math.floor(drop.r1);
			drop.xspeed += 10 * this.PRIVATE_GRAVITY_FORCE_FACTOR_X * Math.floor(drop.r1);
		}
	} else {
		drop.yspeed = this.PRIVATE_GRAVITY_FORCE_FACTOR_Y;
		drop.xspeed = this.PRIVATE_GRAVITY_FORCE_FACTOR_X;
	}

	// 雨滴移动
	drop.y += drop.yspeed;
	drop.x += drop.xspeed;

	// 绘制雨滴
	drop.draw();
	return false;
};
/* ��������������֮�� www.lanrenzhijia.com */
/**
 * 反射功能:完全没有反射
 * @param drop 雨滴对象
 */
RainyDay.prototype.REFLECTION_NONE = function(drop) {
	// 上下文填充样式
	this.context.fillStyle = this.VARIABLE_FILL_STYLE;
	this.context.fill();
};

/**
 * 反射函数:微型反射(默认)
 * @param drop 雨滴对象
 */
RainyDay.prototype.REFLECTION_MINIATURE = function(drop) {
	this.context.drawImage(this.reflected, drop.x - drop.r1, drop.y - drop.r1, drop.r1 * 2, drop.r1 * 2);
};

/**
 * COLLISION function: default collision implementation
 * @param drop1 one of the drops colliding
 * @param drop2 the other one
 */
RainyDay.prototype.COLLISION_SIMPLE = function(drop1, drop2) {
	drop1.clear();
	// force stopping the second drop
	drop2.clear(true);

	drop1.x = (drop1.x + drop2.x) / 2;
	drop1.y = (drop1.y + drop2.y) / 2;
};

var mul_table = [
	512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
	454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
	482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456,
	437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
	497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328,
	320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
	446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
	329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
	505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
	399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328,
	324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
	268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
	451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
	385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335,
	332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
	289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259
];

var shg_table = [
	9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
	17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
	19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
	20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
	21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
	21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
	22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
	22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
	23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24
];

/**
 * 绘制和模糊背景图像
 * @param radius 模糊半径
 * @param width 画布宽度
 * @param height 画布高度
 */
RainyDay.prototype.prepareBackground = function(radius, width, height) {
	if (width && height) {
		// 画布样式
		this.canvas.style.width = width + "px";
		this.canvas.style.height = height + "px";
		// 设置画布的宽高
		this.canvas.width = width;
		this.canvas.height = height;
	} else {
		width = this.canvas.width;
		height = this.canvas.height;
	}

	var context = this.canvas.getContext("2d");
	// 清除矩形
	context.clearRect(0, 0, width, height);
	// 绘制背景图像
	context.drawImage(this.img, 0, 0, width, height);

	if (isNaN(radius) || radius < 1) return;

	// 模糊背景图像
	this.stackBlurCanvasRGB(0, 0, width, height, radius);
};

/**模糊图像：实现堆栈模糊算法
 *  (@see http://www.quasimondo.com/StackBlurForCanvas/StackBlurDemo.html).
 * @param top_x 模糊矩形的左上角的X
 * @param top_y 模糊矩形的左上角的Y
 * @param width 画布宽度
 * @param height 画布高度
 * @param radius 模糊半径
 */
RainyDay.prototype.stackBlurCanvasRGB = function(top_x, top_y, width, height, radius) {
	radius |= 0;

	var context = this.canvas.getContext("2d");
	var imageData = context.getImageData(top_x, top_y, width, height);

	// 画布图像的像素信息
	var pixels = imageData.data;

	var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
		r_out_sum, g_out_sum, b_out_sum,
		r_in_sum, g_in_sum, b_in_sum,
		pr, pg, pb, rbs;

	var div = radius + radius + 1;
	var w4 = width << 2;
	var widthMinus1 = width - 1;
	var heightMinus1 = height - 1;
	var radiusPlus1 = radius + 1;
	var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

	// 定义堆栈模糊算法的辅助对象
	var stackStart = new BlurStack();
	var stack = stackStart;
	for (i = 1; i < div; i++) {
		stack = stack.next = new BlurStack();
		if (i == radiusPlus1) var stackEnd = stack;
	}
	stack.next = stackStart;
	var stackIn = null;
	var stackOut = null;

	yw = yi = 0;

	var mul_sum = mul_table[radius];
	var shg_sum = shg_table[radius];

	for (y = 0; y < height; y++) {
		r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;

		r_out_sum = radiusPlus1 * (pr = pixels[yi]);
		g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
		b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);

		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;

		stack = stackStart;

		for (i = 0; i < radiusPlus1; i++) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}

		for (i = 1; i < radiusPlus1; i++) {
			p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
			r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
			g_sum += (stack.g = (pg = pixels[p + 1])) * rbs;
			b_sum += (stack.b = (pb = pixels[p + 2])) * rbs;

			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;

			stack = stack.next;
		}

		stackIn = stackStart;
		stackOut = stackEnd;
		for (x = 0; x < width; x++) {
			pixels[yi] = (r_sum * mul_sum) >> shg_sum;
			pixels[yi + 1] = (g_sum * mul_sum) >> shg_sum;
			pixels[yi + 2] = (b_sum * mul_sum) >> shg_sum;

			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;

			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;

			p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

			r_in_sum += (stackIn.r = pixels[p]);
			g_in_sum += (stackIn.g = pixels[p + 1]);
			b_in_sum += (stackIn.b = pixels[p + 2]);

			r_sum += r_in_sum;
			g_sum += g_in_sum;
			b_sum += b_in_sum;

			stackIn = stackIn.next;

			r_out_sum += (pr = stackOut.r);
			g_out_sum += (pg = stackOut.g);
			b_out_sum += (pb = stackOut.b);

			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;

			stackOut = stackOut.next;

			yi += 4;
		}
		yw += width;
	}


	for (x = 0; x < width; x++) {
		g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;

		yi = x << 2;
		r_out_sum = radiusPlus1 * (pr = pixels[yi]);
		g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
		b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);

		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;

		stack = stackStart;

		for (i = 0; i < radiusPlus1; i++) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}

		yp = width;

		for (i = 1; i <= radius; i++) {
			yi = (yp + x) << 2;

			r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
			g_sum += (stack.g = (pg = pixels[yi + 1])) * rbs;
			b_sum += (stack.b = (pb = pixels[yi + 2])) * rbs;

			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;

			stack = stack.next;

			if (i < heightMinus1) {
				yp += width;
			}
		}

		yi = x;
		stackIn = stackStart;
		stackOut = stackEnd;
		for (y = 0; y < height; y++) {
			p = yi << 2;
			pixels[p] = (r_sum * mul_sum) >> shg_sum;
			pixels[p + 1] = (g_sum * mul_sum) >> shg_sum;
			pixels[p + 2] = (b_sum * mul_sum) >> shg_sum;

			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;

			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;

			p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

			r_sum += (r_in_sum += (stackIn.r = pixels[p]));
			g_sum += (g_in_sum += (stackIn.g = pixels[p + 1]));
			b_sum += (b_in_sum += (stackIn.b = pixels[p + 2]));

			stackIn = stackIn.next;

			r_out_sum += (pr = stackOut.r);
			g_out_sum += (pg = stackOut.g);
			b_out_sum += (pb = stackOut.b);

			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;

			stackOut = stackOut.next;

			yi += width;
		}
	}

	context.putImageData(imageData, top_x, top_y);

};

/**
 * 为堆栈模糊算法定义一个新的辅助对象
 */

function BlurStack() {
	this.r = 0;
	this.g = 0;
	this.b = 0;
	this.a = 0;
	this.next = null;
}

/**
 * 定义一个重力矩阵对象，用于处理碰撞检测
 * @param x 矩阵中的列数
 * @param y 矩阵中的行数
 * @param r 网格大小
 */

function CollisionMatrix(x, y, r) {
	this.resolution = r;
	this.xc = x;
	this.yc = y;
	this.matrix = new Array(x);
	for (var i = 0; i <= (x + 5); i++) {
		this.matrix[i] = Array(y);
		for (var j = 0; j <= (y + 5); ++j) {
			this.matrix[i][j] = new DropItem(null);
		}
	}
}

/**
 * 更新碰撞矩阵上给定掉落点的位置
 * @param drop 雨滴被定位/重新定位
 * @forceDelete 如果为真，雨滴将从矩阵中移除
 * @returns 碰撞
 */
CollisionMatrix.prototype.update = function(drop, forceDelete) {
	if (drop.gid) {
		this.matrix[drop.gmx][drop.gmy].remove(drop);
		if (forceDelete) {
			return null;
		}

		drop.gmx = Math.floor(drop.x / this.resolution);
		drop.gmy = Math.floor(drop.y / this.resolution);
		this.matrix[drop.gmx][drop.gmy].add(drop);

		var collisions = this.collisions(drop);
		if (collisions && collisions.next != null) {
			return collisions.next;
		}
	} else {
		drop.gid = Math.random().toString(36).substr(2, 9);
		drop.gmx = Math.floor(drop.x / this.resolution);
		drop.gmy = Math.floor(drop.y / this.resolution);
		this.matrix[drop.gmx][drop.gmy].add(drop);
	}
	return null;
};

/**
 * 寻找与给定雨滴的碰撞
 * @param drop 雨滴要检查
 * @returns 与它碰撞的水滴列表
 */
CollisionMatrix.prototype.collisions = function(drop) {
	var item = new DropItem(null);
	var first = item;

	item = this.addAll(item, drop.gmx - 1, drop.gmy);
	item = this.addAll(item, drop.gmx - 1, drop.gmy + 1);
	item = this.addAll(item, drop.gmx, drop.gmy + 1);
	item = this.addAll(item, drop.gmx + 1, drop.gmy + 1);
	item = this.addAll(item, drop.gmx + 1, drop.gmy);

	return first;
};

/**
 * 将在给定位置找到的所有下落追加到给定项。
 * @param to 将结果附加到其中的项
 * @param x X在矩阵中的位置
 * @param y Y在矩阵中的位置
 * @returns 列表中最后发现的项目
 */
CollisionMatrix.prototype.addAll = function(to, x, y) {
	if (x > 0 && y > 0 && x < this.xc && y < this.yc) {
		var items = this.matrix[x][y];
		while (items.next != null) {
			items = items.next;
			to.next = new DropItem(items.drop);
			to = to.next;
		}
	}
	return to;
};

/**
 * 定义一个链表项
 */

function DropItem(drop) {
	this.drop = drop;
	this.next = null;
}

/**
 * 将雨滴添加到列表的末尾
 * @param drop
 */
DropItem.prototype.add = function(drop) {
	var item = this;
	while (item.next != null) {
		item = item.next;
	}
	item.next = new DropItem(drop);
};

/**
 * 从列表中移除雨滴
 * @param drop raindrop to be removed
 */
DropItem.prototype.remove = function(drop) {
	var item = this;
	var prevItem = null;
	while (item.next != null) {
		prevItem = item;
		item = item.next;
		if (item.drop.gid == drop.gid) {
			prevItem.next = item.next;
		}
	}
};