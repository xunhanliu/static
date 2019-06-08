//记录circle的text
var shiftKey;


//由于keyUp keyDown 比较操蛋, 在父元素上加



class circleBrush {
    /*
    与具体的class实例有关的部分要放在初始化中
     */
    constructor(dom, brushDom, pointCssSel) {
        /**
         * brushDom: 是在哪一层绘制brush层
         * pointCssSel: 点的css选择{填写circle的group层。每个点上面要套一个group}
         */
        this.parentDom = dom; //用于添加事件
        this.gDraw = d3.select(brushDom);
        this.gBrushHolder = this.gDraw.append('g');
        this.gBrush = null;
        this.brushMode = false;
        this.brushing = false;
        this.pointCssSel = pointCssSel;
        this.pointFatherDom=null;
        this.allowDraw=true;

        this.brush = d3.brush()
            .on("start", this._brushstarted(this))
            .on("brush", this._brushed(this))
            .on("end", this._brushended(this));
        d3.select(this.parentDom).on('keydown', this._keydown(this));
        d3.select(this.parentDom).on('keyup', this._keyup(this));
        d3.select(this.parentDom).on('click', this._click(this));
    }
    isAllowDraw(_){
        return arguments.length ? (this.allowDraw=_ ,  _): this.allowDraw;
    }
    setPointFatherCssSel(_){
        this.pointFatherDom=_;

    }
    _click(that) {
        return function () {
            d3.select(that.parentDom).selectAll('.selected').classed("selected", function (d) {
                d.selected = d.previouslySelected = false;
                return false;
            });
        }
    }

    _brushstarted(that) {
        // keep track of whether we're actively brushing so that we
        // don't remove the brush on keyup in the middle of a selection
        return function () {
            if(!that.allowDraw) return;
            that.brushing = true;
            var node;
            if(that.pointFatherDom){
                 node = d3.select(that.pointFatherDom).selectAll(that.pointCssSel);
            }else{
                 node = that.gDraw.selectAll(that.pointCssSel);
            }

            node.each(function (d) {
                d.previouslySelected = shiftKey && d.selected;
            });
        }
    }

    _brushed(that) {
        return function () {
            if(!that.allowDraw) return;
            if (!d3.event.sourceEvent) return;
            if (!d3.event.selection) return;

            var extent = d3.event.selection;
            var node;
            if(that.pointFatherDom){
                node = d3.select(that.pointFatherDom).selectAll(that.pointCssSel);
            }else{
                node = that.gDraw.selectAll(that.pointCssSel);
            }
            node.classed("selected", function (d) {
                return d.selected = d.previouslySelected ^
                    (extent[0][0] <= d.x && d.x < extent[1][0]
                        && extent[0][1] <= d.y && d.y < extent[1][1]);
            });


        }
    }

    _brushended(that) {
        return function () {
            if(!that.allowDraw) return;
            if (!d3.event.sourceEvent) return;
            if (!d3.event.selection) return;
            if (!that.gBrush) return;

            that.gBrush.call(that.brush.move, null);

            if (!that.brushMode) {
                // the shift key has been release before we ended our brushing
                that.gBrush.remove();
                that.gBrush = null;
            }
            that.brushing = false;

        }
    }

    _keydown(that) {
        return function () {
            if(!that.allowDraw) return;
            if(!that.allowDraw) return;
            shiftKey = d3.event.shiftKey;

            if (shiftKey) {
                // if we already have a this.brush, don't do anything
                if (that.gBrush)
                    return;

                that.brushMode = true;

                if (!that.gBrush) {

                    that.gBrush = that.gBrushHolder.append('g');
                    that.gBrush.call(that.brush);
                }
            }
        }
    }

    _keyup(that) {
        return function () {
            if(!that.allowDraw) return;
            shiftKey = false;
            that.brushMode = false;
            if (!that.gBrush)
                return;
            if (!that.brushing) {
                // only remove the that.brush if we're not actively that.brushing
                // otherwise it'll be removed when the that.brushing ends
                that.gBrush.remove();
                that.gBrush = null;
            }
        }
    }


    getBrushSel(callback) {
        var that = this;
        var sel = [];
        if(that.pointFatherDom){
            d3.select(that.pointFatherDom).selectAll(that.pointCssSel + ".selected").each(function (d) {
                sel.push(callback(d));
            })
        }else{
            d3.select(that.parentDom).selectAll(that.pointCssSel + ".selected").each(function (d) {
                sel.push(callback(d));
            })
        }

        return sel;
    }


}

//换结构
var circleBrush1 = function () {
    var parentDom; //用于添加事件
    var gDraw;
    var gBrushHolder;
    var gBrush = null;
    var brushMode = false;
    var brushing = false;
    var pointCssSel;
    var circle_brush_sel = [];
    circleBrush1.setPara = function (_parentDom, _pointCssSel) {
        parentDom = _parentDom;
        pointCssSel = _pointCssSel;
        return circleBrush1;
    }

    function circleBrush1(_) {
        gDraw = _;
        gBrushHolder = gDraw.append('g');
        brush = d3.brush()
            .on("start", circleBrush1.c_brushstarted)
            .on("brush", circleBrush1.c_brushed)
            .on("end", circleBrush1.c_brushended);
        d3.select('body').on('keydown', circleBrush1.c_keydown);
        d3.select('body').on('keyup', circleBrush1.c_keyup);
        d3.select(parentDom).on('click', circleBrush1.c_click);
    }

    circleBrush1.getBrushSel = function (callback) {
        var sel = [];
        d3.select(parentDom).selectAll(pointCssSel + ".selected").each(function (d) {
            sel.push(callback(d));
        })
        return sel;
    }
    circleBrush1.c_click = function () {
        //用于清空选择

        d3.select(parentDom).selectAll('.selected').classed("selected", function (d) {
            d.selected = d.previouslySelected = false;
            return false;
        });
        circle_brush_sel = [];
    }
    circleBrush1.c_brushstarted = function () {
        // keep track of whether we're actively brushing so that we
        // don't remove the brush on keyup in the middle of a selection
        brushing = true;
        var node = gDraw.selectAll(pointCssSel);
        node.each(function (d) {
            d.previouslySelected = shiftKey && d.selected;
        });
    }

    circleBrush1.c_brushed = function () {
        if (!d3.event.sourceEvent) return;
        if (!d3.event.selection) return;

        var extent = d3.event.selection;
        var node = gDraw.selectAll(pointCssSel);
        node.classed("selected", function (d) {
            return d.selected = d.previouslySelected ^
                (extent[0][0] <= d.x && d.x < extent[1][0]
                    && extent[0][1] <= d.y && d.y < extent[1][1]);
        });
    }

    circleBrush1.c_brushended = function () {
        if (!d3.event.sourceEvent) return;
        if (!d3.event.selection) return;
        if (!gBrush) return;

        gBrush.call(brush.move, null);

        if (!brushMode) {
            // the shift key has been release before we ended our brushing
            gBrush.remove();
            gBrush = null;
        }
        brushing = false;
        circleBrush1.c_getSelPoint();

    }

    circleBrush1.c_getSelPoint = function () { //获取name
        if ($(parentDom).find(pointCssSel + ".selected").length) {
            circle_brush_sel = [];
            d3.select(parentDom).selectAll(pointCssSel + ".selected").each(function (d) {
                var name = d.text;
                if (circle_brush_sel.indexOf(name) == -1) {
                    circle_brush_sel.push(name);
                }
            })
            console.log(circle_brush_sel);
        }
        else {
            circle_brush_sel = [];
        }
        return circle_brush_sel;
    }


    circleBrush1.c_keydown = function () {
        shiftKey = d3.event.shiftKey;

        if (shiftKey) {
            // if we already have a this.brush, don't do anything
            if (gBrush)
                return;

            brushMode = true;

            if (!gBrush) {

                gBrush = gBrushHolder.append('g');
                gBrush.call(brush);
            }
        }
    }

    circleBrush1.c_keyup = function () {
        shiftKey = false;
        brushMode = false;
        if (!gBrush)
            return;
        if (!brushing) {
            // only remove the brush if we're not actively brushing
            // otherwise it'll be removed when the brushing ends
            gBrush.remove();
            gBrush = null;
        }
    }
    return circleBrush1;

}




