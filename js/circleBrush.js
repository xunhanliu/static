//记录circle的text
var shiftKey;
var ctrlKey;

//由于keyUp keyDown 比较操蛋, 在父元素上加
function  IsPointInPolygon(py ,pt)
{
    count = py.length;

    if(count < 3)
    {
        return false;
    }

    result = false;

    for(var i = 0, j = count - 1; i < count; i++)
    {
        var p1 = py[i];
        var p2 = py[j];

        if(p1.x < pt.x && p2.x >= pt.x || p2.x < pt.x && p1.x >= pt.x)
        {
            if(p1.y + (pt.x - p1.x) / (p2.x - p1.x) * (p2.y - p1.y) < pt.y)
            {
                result = !result;
            }
        }
        j = i;
    }
    return result;
}


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
        this.gBrushHolder = this.gDraw.append('g');  //这个是brush的画布

        this.gBrush = null;
        this.brushing = false;
        this.pointCssSel = pointCssSel;
        this.pointFatherDom=null;
        this.allowDraw=true;
        this.brushMode=false;
        //第二套状态变量
        this.brushType='rect';
        this.pBrushMode=false;
        this.pBrushing=false;
        this.gBrushPolygon=null;
        this.polygonCircleR=4;
        this.polygons=[[]];
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


    getBrushSel(callback) {
        var that = this;
        var sel = [];
        if(that.pointFatherDom){
            d3.select(that.pointFatherDom).selectAll(that.pointCssSel + ".selected").each(function (d) {
                var result=callback(d);
                if(typeof result=="string" ||typeof result=="number") sel.push(result);
                else sel=sel.concat(result);
            })
        }else{
            d3.select(that.parentDom).selectAll(that.pointCssSel + ".selected").each(function (d) {
                var result=callback(d);
                if(typeof result=="string" ||typeof result=="number") sel.push(result);
                else sel=sel.concat(result);
            })
        }

        return sel;
    }

    _polygonBrush(){
        this.brushType='polygon';
        //在gBrushHolder中绘制


    }

    clearPolygonBrush(){
        (function (that) {   //把所有的select都去掉
            d3.select(that.parentDom).selectAll('.selected').classed("selected", function (d) {
                d.selected = d.previouslySelected = false;
                return false;
            });
            $(that.parentDom).css('cursor','');
            //把所有的多边形都删掉
            that.polygons=[[]];
            that.gBrushPolygon.remove();
            that.gBrushPolygon = null;

        })(this);


    }
    _keydown(that) {
        return function () {
            if(!that.allowDraw) return;
            shiftKey = d3.event.shiftKey;
            ctrlKey=d3.event.ctrlKey;
            if (shiftKey) {
                // if we already have a this.brush, don't do anything
                that.brushType='rect';
                if (that.gBrush)
                    return;

                that.brushMode = true;

                if (!that.gBrush) {

                    that.gBrush = that.gBrushHolder.append('g');
                    that.gBrush.call(that.brush);
                }
            }
            else if(ctrlKey){
                that.brushType='polygon';
                //设置父窗口的cursor
                $(that.parentDom).css('cursor','copy');

                that.pBrupBrushing = true;
                that.pBrushMode=true;
                if (!that.gBrushPolygon) {
                    that.gBrushPolygon = that.gBrushHolder.append('g');
                }

            }
        }
    }

    _keyup(that) {
        return function () {
            if(!that.allowDraw) return;
            if(d3.event.key=='Shift'){
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
            }else if(d3.event.key=='Control'){
                ctrlKey=false;
                that.pBrupBrushing=false;
                if(that.polygons[that.polygons.length-1].length>=3){  //终值继续添加的状态
                    that.polygons.push([])
                } //仍需继续添加
                $(that.parentDom).css('cursor','');


            }
        }


    }

    _gBrushCircle(that){    //点的点击，进行减点的操作
        return function () {

            d3.event.stopPropagation();
        }
    }
    _click(that) {
        return function () {

            if(that.brushType=='rect'){
                d3.select(that.parentDom).selectAll('.selected').classed("selected", function (d) {
                    d.selected = d.previouslySelected = false;
                    return false;
                });
            }
            else if(that.brushType=='polygon' && ctrlKey) { //此时点击视图，不会清除select,必须手动清除  选择依旧是求区域的差集
                //在that.gBrushPolygon中进行绘制，  进行加点操作
                const x=d3.mouse( that.gBrushHolder.node())[0];
                const y=d3.mouse(that.gBrushHolder.node())[1];
                //that.polygons 的最后一个元素（polygon）上进行加点的操作
                const lastPolygonIndex=that.polygons.length-1;
                if(that.polygons[lastPolygonIndex].length==0){  //空集，直接加点
                    that.polygons[lastPolygonIndex].push({x:x,y:y,index:0,polygonIndex:lastPolygonIndex});
                }else{
                    //最后一个polygon的最后一个点，离[x,y]较近，归为路径的闭合
                    const lastLastPolygonIndex=that.polygons[lastPolygonIndex].length-1;
                    if(pointDistance({x:x,y:y},that.polygons[lastPolygonIndex][0])<that.polygonCircleR*2){  //区域闭合
                        //新开的时候需要注意，
                        if (that.polygons[lastPolygonIndex].length>=3)
                        {
                            that.polygons.push([]);
                        }
                    }else{
                        that.polygons[lastPolygonIndex].push({x:x,y:y,index:lastLastPolygonIndex,polygonIndex:lastLastPolygonIndex});
                    }
                }
                //根据that.polygons数据进行绘制circle和polygon
                that.drawBrushPolygon();
                that.polygonRefreshSel();
                d3.event.stopPropagation();
            }
        }
    }
    polygonRefreshSel(){
        (function (that) {
            var node;
            if(that.pointFatherDom){
                node = d3.select(that.pointFatherDom).selectAll(that.pointCssSel);
            }else{
                node = that.gDraw.selectAll(that.pointCssSel);
            }
            node.classed("selected", function (d) {
                //this.polygons
                // console.log(d3.select(this).node())
                // console.log(d3.select(this).attr('cx'))
                // var datum=d3.select(this).datum();
                // console.log(datum.x+'::'+datum.y);
                // var polygons=[]
                // for(var i in that.polygons){
                //     if(that.polygons[i].length<3){
                //         continue;
                //     }else{
                //         polygons.push(that.polygons[i].map(function (d) {
                //             return [d.x,d.y];
                //         }))
                //     }
                // }
                var flag=false;
                for(var i in that.polygons){
                    if(that.polygons[i].length<3) break;
                    if(IsPointInPolygon(that.polygons[i],d)){
                        flag=true;
                        break;
                    }
                }

                //求或
                if(flag){
                    d.previouslySelected=false;
                    d.selected=true;
                    return true;
                }else{
                    d.previouslySelected=d.selected=false;
                    return false;
                }
            });
        })(this);
    }
   drawBrushPolygon() {
       (function (that) {
           const drag=d3.drag()  //circle的drag
               // .subject(function () {
               //     var thisData = d3.select(this);
               //     return {
               //         x: thisData.datum().x,
               //         y: thisData.datum().y
               //     };
               // })
               // .on("start", dragstarted)
               .on("drag", dragmove)
               .on("end", dragended)
           ;
           function dragended() {
               that.polygonRefreshSel();
           }
           function dragmove() {
               d3.select(this).attr('cx',function (d) {
                   d.x=d3.event.x;
                   d.y=d3.event.y;
                   return d3.event.x
               }).attr("cy",d3.event.y);
               //更新ploygon
               that.gBrushPolygon.selectAll('.gBrushPolygon').data(that.polygons)
                    .select('polygon').attr('points',function (d) {
                       return d.map(function (item) {
                           return item.x+','+item.y;
                       }).join(' ');
               });

           }
           const gPolygon_data=that.gBrushPolygon.selectAll('.gBrushPolygon').data(that.polygons); //update
           const gPolygon_enter= gPolygon_data.enter()
               .append('g')
               .attr('class','gBrushPolygon');
           gPolygon_data.exit().remove();

           gPolygon_enter.each(function (data) {
               const circle_data=d3.select(this).selectAll('circle').data(data);
               circle_data.attr('cx',d=>d.x).attr('cy',d=>d.y);
               circle_data.enter().append("circle")
                   .attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',that.polygonCircleR).style('fill-opacity',d=> (d.index==0? 1:0))
                   .call(drag);
               circle_data.exit().remove();
           });

           gPolygon_enter.append('polygon').attr('points',function (d) {
               return d.map(function (item) {
                   return item.x+','+item.y;
               }).join(' ');
           })
               .on('dblclick',function () {
                   that.clearPolygonBrush();
               });

           gPolygon_data.each(function (data) {
               const circle_data=d3.select(this).selectAll('circle').data(data);
               circle_data.attr('cx',d=>d.x).attr('cy',d=>d.y);
               circle_data.enter().append("circle")
                   .attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',that.polygonCircleR).style('fill-opacity',d=> (d.index==0? 1:0))
                   .call(drag);
               circle_data.exit().remove();
           });

           gPolygon_data.select('polygon').attr('points',function (d) {
               return d.map(function (item) {
                   return item.x+','+item.y;
               }).join(' ');
           });
       })(this);
   }
}


function pointDistance(p1,p2){
    return Math.sqrt((p2.x-p1.x)**2+(p2.y-p1.y)**2);
}
