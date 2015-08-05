//{{{
/*********************************************************
 * jquery.emathfuncgraph.js
 * jQuery-plugin for drawing functions
 * Created by: E-Math -project ( http://emath.eu )
 * Petri Salmela
 * Petri Sallasmaa
 * 26.09.2012
 * v.1.1
 * Copyright: Four Ferries oy
 *   http://fourferries.fi
 * License: GNU AGPL
 ********************************************************/

(function($){
    // jQuery plugin
    $.fn.emathfuncgraph = function(options){
        // Test for funcgraph commands and trigger command with options.
        if (typeof(options) === 'string'){
            var cmd = options;
            options = arguments[1] || {};
            if (typeof(options) === 'string'){
                options = {name: options};
            }
            // Placeholder variable for returning value.
            options.result = this;
            this.trigger(cmd, options);
            return options.result;
        }else if (typeof(options) === 'object' || !options) {
                // Passing this 'this' to methods.init (so this there is also 'this')
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' +  options + ' does not exist on jQuery.emathtable' );
            return this;
        }

    }
    

    var methods = {
                
        'init' : function(options) {

            var useLegacyDataType = !options['type'];

            var settings;
            
            if (useLegacyDataType) {
                settings = convertToNew(options);
            } else {
                settings = options;
            }

            // Return this so that methods of jQuery element can be chained.
            return this.each(function() {
                // Create new Emathfuncgraph object.
                var emfuncgraph = new Emathfuncgraph(this, settings);
                // Init the emathfuncgraph
                emfuncgraph.init();
            });
        },
        'get' : function() {
            var $place = $(this).eq(0);
            var options = {};
            //$place.trigger('get', options);
            //return options.result;
            $place.trigger('getdata');
            return $place.data('[[elementdata]]');
            // var data = $place.data('[[pageelementdata]]');
            //return data;
        },
        'setdata' : function(params) {
            var $place = $(this);
            $place.trigger('setdata', [ params ]);
        }
    }
    
    var convertToNew = function(options){
        var params = $.extend(true, {}, Emathfuncgraph.defaults);
        params.settings.theme = options.theme;
        params.settings.mode = (options.authormode ? 'author' : (options.editable ? 'edit' : 'view'));
        params.settings.decimalperiod = options.decimalperiod;
        params.settings.vertical = options.vertical;
        params.data.xscale = options.xscale;
        params.data.yscale = options.yscale;
        params.data.listvisible = (options.listvisible === false ? false : true);
        params.data.elements = [];
        if (options.elements) {
            for (var i = 0; i < options.elements.length; i++){
                params.data.elements.push(options.elements[i]);
            }
        }
        // Make a copy of params to avoid references!
        params = JSON.parse(JSON.stringify(params));
        return params;
    }
    
    $.fn.funcgraphelement = function(method){
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof(method) === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist in funcgraphelement.');
            return false;
        }
    }
    
    
    var Emathfuncgraph = function(place, settings){
        // Constructor for Emathfuncgraph object.
        this.settings = $.extend(true, {}, Emathfuncgraph.defaults, settings);
        this.place = $(place);
        this.place.addClass('emathfuncgraph');
        this.theme = this.settings.settings.theme;
        this.xscale = this.settings.data.xscale;
        this.yscale = this.settings.data.yscale;
        this.editable = this.settings.settings.mode === 'edit' || this.settings.settings.mode === 'author';
        this.authormode = this.settings.settings.mode === 'author';
        this.vertical = this.settings.settings.vertical;
        this.presentation = this.settings.settings.presentation;
        this.listvisible = this.settings.data.listvisible;
        this.decimalperiod = this.settings.settings.decimalperiod;
        this.elements = [];
        this.elementsByName = {};
        this.usersettings = this.settings.settings;
        this.metadata = this.settings.metadata;
        // Add new functions and points.
        var data = this.settings.data;
        for (var i = 0; i < data.elements.length; i++){
            if (!data.elements[i].type){
                continue;
            }
            switch (data.elements[i].type){
                case 'function':
                    this.addFunction(data.elements[i], true);
                    break;
                case 'point':
                    this.addPoint(data.elements[i], true);
                    break;
                case 'segment':
                    this.addSegment(data.elements[i], true);
                    break;
                case 'circle':
                    this.addCircle(data.elements[i], true);
                    break;
                case 'line':
                    this.addLine(data.elements[i], true);
                    break;
                default:
                    break;
            }
        }
        // Add css styles if they don't exist already.
        if ($('head style#emathfuncgraphstyle').length === 0){
            $('head').append('<style id="emathfuncgraphstyle" type="text/css">'+Emathfuncgraph.strings['style']+'</style>');
        }
    }
    
    Emathfuncgraph.prototype.init = function(){
        // Init and draw the functions
        var emathfuncgraph = this;
        this.place.empty();
        if (this.place.hasClass('emathfuncgraph_rendered')){
//             return false;
        }
        this.place.addClass('emathfuncgraph_rendered').addClass(this.settings.theme).attr('vertical', this.vertical);
        this.emfgareanumber = -1;
        while ($('#emfuncgraph_'+(++this.emfgareanumber)).length > 0){};
        var authorbar = '<li'+(!this.listvisible ? ' emfg_listhidden="true"' : '')+'><input type="checkbox" id="emfg_viewcheck_'+this.emfgareanumber+'"'+(!this.listvisible ? 'checked="checked"' : '')+' /><label for="emfg_viewcheck_'+this.emfgareanumber+'" class="emfg_gradbg emfuncgraphtoolbutton emfuncgraphviewmode"><span></span></label></li><li '+(this.editable ? ' emfg_iseditable="true"' : '')+'><input type="checkbox" id="emfg_editcheck_'+this.emfgareanumber+'"'+(this.editable ? ' checked="checked"' : '')+' /><label for="emfg_editcheck_'+this.emfgareanumber+'" class="emfg_gradbg emfuncgraphtoolbutton emfuncgrapheditmode"><span></span></label></li><li><a href="javascript:;" class="emfg_gradbg emfuncgraphtoolbutton emfuncgraphsettings"><span></span></a></li>';
        var toolbar = this.isEditable() ? '<ul class="emfuncgraphtoolbar">'+(this.authormode ? authorbar : '')+'<li><a href="javascript:;" class="emfg_gradbg emfuncgraphtoolbutton emfg_presentationmode_button"><span></span></a></li></ul>' : '<ul class="emfuncgraphtoolbar"><li><a href="javascript:;" class="emfg_gradbg emfuncgraphtoolbutton emfg_presentationmode_button"><span></span></a></li></ul>';
        this.dispareaid = 'emfuncgraph_'+this.emfgareanumber;
        var $emfuncgraph = $('<div class="emfuncgraphwrapper emfg_gradbg"><div id="'+this.dispareaid+'" class="emfuncgraphdisplayarea"></div><div class="emfuncgraphaddarea"></div>'+toolbar+'</div>');
        this.place.empty().append($emfuncgraph);
        this.displayarea = $emfuncgraph.find('.emfuncgraphdisplayarea');
        this.addarea = $emfuncgraph.find('.emfuncgraphaddarea');
        this.funcgraph = $emfuncgraph;
        if (this.presentation){
            this.funcgraph.addClass('emfg_presentation');
        }
        this.place.find('a.emfg_presentationmode_button').click(function(e){
            // Toggle presentation mode.
            if ($(this).is('.emfg_presentation a')){
                $(this).trigger('stoppresentation');
            } else {
                $(this).trigger('startpresentation');
            }
        });
        this.place.find('input#emfg_viewcheck_'+this.emfgareanumber).change(function(){
            // Toggle viewing of elementlist in show mode.
            var hidden = $(this).is(':checked');
            emathfuncgraph.listvisible = !hidden;
            $(this).parents('li').eq(0).attr('emfg_listhidden', hidden);
            emathfuncgraph.changed(true);
        });
        this.place.find('input#emfg_editcheck_'+this.emfgareanumber).change(function(){
            // Toggle editability of funcgraph.
            var editable = $(this).is(':checked');
            emathfuncgraph.editable = editable;
            $(this).parents('li').eq(0).attr('emfg_iseditable', editable);
            emathfuncgraph.changed(true);
        });
        this.draw();
        return this;
    }
    
    Emathfuncgraph.prototype.draw = function(){
        // Draw functions and points and show their definitions. Either in edit or show mode.
        if (this.isEditable()){
            this.edit();
        } else {
            this.show();
        }
        this.initEvents();
    }
    
    Emathfuncgraph.prototype.edit = function(){
        // Show everything in edit mode.
        var emfuncgraph = this;
        this.place.addClass('emfuncgraph_editmode');
        if (this.authormode) {
            this.place.addClass('emfuncgraph_authormode');
        } else {
            this.place.removeClass('emfuncgraph_authormode');
        }
        this.place.removeClass('emfg_listhidden');
        var addarea = '<ul class="emfg_elemlist">';
        addarea += '</ul><ul class="emfg_addpanel"><li class="emfg_additem"><a href="javascript:;" class="emfg_gradbg" addtype="point"><span></span></a></li><li class="emfg_additem"><a href="javascript:;" class="emfg_gradbg" addtype="function"><span></span></a></li><li class="emfg_additem"><a href="javascript:;" class="emfg_gradbg" addtype="segment"><span></span></a></li><li class="emfg_additem"><a href="javascript:;" class="emfg_gradbg" addtype="circle"><span></span></a></li><li class="emfg_additem"><a href="javascript:;" class="emfg_gradbg" addtype="line"><span></span></a></li></ul><ul class="emfg_removepanel"></ul></div>';
        this.addarea.html(addarea);
        this.elemlist = this.addarea.find('ul.emfg_elemlist');
        for (var i = 0; i < this.elements.length; i++){
            var $elemitem = $('<li></li>');
            this.elemlist.append($elemitem);
            if (this.elements[i].isReadonly() && !this.authormode){
                this.elements[i].drawShowItem($elemitem);
            } else {
                this.elements[i].drawEditItem($elemitem);
            }
        }
        this.drawElements();
    }
    
    Emathfuncgraph.prototype.show = function(){
        // Show everithing in show mode.
        var emfuncgraph = this;
        this.place.removeClass('emfuncgraph_editmode emfuncgraph_authormode');
        if (this.listvisible) {
            this.place.removeClass('emfg_listhidden');
        } else {
            this.place.addClass('emfg_listhidden');
        }
        var addarea = '<ul class="emfg_elemlist" emfg_editable="'+this.isEditable()+'">';
        addarea += '</ul>'
        this.addarea.html(addarea);
        this.elemlist = this.addarea.find('ul.emfg_elemlist');
        for (var i = 0; i < this.elements.length; i++){
            var $elemitem = $('<li></li>');
            this.elemlist.append($elemitem);
            this.elements[i].drawShowItem($elemitem);
        }
        this.drawElements();
    }
    
    Emathfuncgraph.prototype.initEvents = function(){
        // Init all events.
        var emfuncgraph = this;

        // TODO: This is for the old book
        this.place.unbind('get').bind('get', function(e, options){
            // custom event for getting data with jQuery plugin.
            return emfuncgraph.getData(options);
        });
        
        
        this.place.unbind('getdata').bind('getdata', function(e, options){
            emfuncgraph.place.data('[[elementdata]]', emfuncgraph.getData(options));
        });
        
        this.place.unbind('answer').bind('answer', function(e, options){
            // custom event for getting data with jQuery plugin.
            return emfuncgraph.getAnswer(options);
        });
        
        this.place.unbind('add').bind('add', function(e, options){
            // custom event for adding elements with jQuery plugin
            if (!options || !options.type){
                return false;
            }
            switch (options.type){
                case 'function':
                    emfuncgraph.addFunction(options);
                    break;
                case 'point':
                    emfuncgraph.addPoint(options);
                    break;
                case 'segment':
                    emfuncgraph.addSegment(options);
                    break;
                case 'circle':
                    emfuncgraph.addCircle(options);
                    break;
                case 'line':
                    emfuncgraph.addLine(options);
                    break;
                default:
                    break;
            }
            emfuncgraph.draw();
            emfuncgraph.addarea.find('li.emfg_element').last().find('.mathquill-editable').eq(0).focus().focusin();
            return true;
        });
        
        this.place.unbind('startpresentation').bind('startpresentation', function(e, options){
            // custom event for starting presentation with jQuery plugin.
            emfuncgraph.placebackup = emfuncgraph.place;
            $('body').append('<div id="emfg_presentationwrapper" class="emathfuncgraph emathfuncgraph_rendered '+emfuncgraph.theme+'"></div>');
            emfuncgraph.place = $('#emfg_presentationwrapper');
            emfuncgraph.place.append(emfuncgraph.funcgraph);
            emfuncgraph.funcgraph.addClass('emfg_presentation');
            emfuncgraph.presentation = true;
            emfuncgraph.draw();
        });
        
        this.place.unbind('stoppresentation').bind('stoppresentation', function(e, options){
            // custom event for ending presentation with jQuery plugin.
            emfuncgraph.funcgraph.removeClass('emfg_presentation');
            emfuncgraph.placebackup.append(emfuncgraph.funcgraph);
            emfuncgraph.place.remove();
            emfuncgraph.place = emfuncgraph.placebackup;
            emfuncgraph.presentation = false;
            emfuncgraph.draw();
        });
        
        this.place.find('ul.emfg_addpanel li.emfg_additem a[addtype]').unbind('click').click(function(e){
            // Click on add button to add item (point or function)
            $(this).trigger('add', {type: $(this).attr('addtype')});
        });

        this.displayarea.mouseup(function(){
            emfuncgraph.dragUpdate();
            emfuncgraph.updateArea();
        });

    }

    Emathfuncgraph.prototype.addFunction = function(options, unchanged){
        // Add new function element
        var elemnum = 1;
        if (typeof(options.name) === 'undefined' || options.name === ''){
            while (typeof(this.elementsByName['f_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'']) !== 'undefined'){
                elemnum++;
            }
            options.name = 'f_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'';
        }
        if (typeof(options.latex) === 'undefined'){
            options.latex = '';
        }
        options.parent = this;
        var newelem = new Emfgfunction(options);
        this.elements.push(newelem);
        this.elementsByName[newelem.name] = newelem;
        if (!unchanged) {
            this.changed(true);
        }
    }
    
    Emathfuncgraph.prototype.addPoint = function(options, unchanged){
        // Add new point element
        var elemnum = 1;
        if (typeof(options.name) === 'undefined' || options.name === ''){
            while (typeof(this.elementsByName['P_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'']) !== 'undefined'){
                elemnum++;
            }
            options.name = 'P_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'';
        }
        if (typeof(options.xcoord) === 'undefined'){
            options.xcoord = 0;
        }
        if (typeof(options.ycoord) === 'undefined'){
            options.ycoord = 0;
        }
        options.parent = this;
        var newelem = new Emfgpoint(options);
        this.elements.push(newelem);
        this.elementsByName[newelem.name] = newelem;
        if (!unchanged) {
            this.changed(true);
        }
    }
    
    Emathfuncgraph.prototype.addSegment = function(options, unchanged){
        // Add new segment between two points
        var elemnum = 1;
        if (typeof(options.name) === 'undefined' || options.name === ''){
            while (typeof(this.elementsByName['s_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'']) !== 'undefined'){
                elemnum++;
            }
            options.name = 's_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'';
        }
        options.parent = this;
        var newelem = new Emfgsegment(options);
        this.elements.push(newelem);
        this.elementsByName[newelem.name] = newelem;
        if (!unchanged) {
            this.changed(true);
        }
    }
    
    Emathfuncgraph.prototype.addCircle = function(options, unchanged){
        // Add new circle element
        var elemnum = 1;
        if (typeof(options.name) === 'undefined' || options.name === ''){
            while (typeof(this.elementsByName['c_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'']) !== 'undefined'){
                elemnum++;
            }
            options.name = 'c_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'';
        }
        if (typeof(options.x0) === 'undefined'){
            options.x0 = 0;
        }
        if (typeof(options.y0) === 'undefined'){
            options.y0 = 0;
        }
        if (typeof(options.r) === 'undefined'){
            options.r = 2;
        }
        options.parent = this;
        var newelem = new Emfgcircle(options);
        this.elements.push(newelem);
        this.elementsByName[newelem.name] = newelem;
        if (!unchanged) {
            this.changed(true);
        }
    }
    
    Emathfuncgraph.prototype.addLine = function(options, unchanged){
        // Add new line element
        var elemnum = 1;
        if (typeof(options.name) === 'undefined' || options.name === ''){
            while (typeof(this.elementsByName['l_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'']) !== 'undefined'){
                elemnum++;
            }
            options.name = 'l_'+(elemnum < 10 ? elemnum : '{'+elemnum+'}')+'';
        }
        if (typeof(options.a) === 'undefined'){
            options.a = 1;
        }
        if (typeof(options.b) === 'undefined'){
            options.b = 1;
        }
        if (typeof(options.c) === 'undefined'){
            options.c = 1;
        }
        if (typeof(options.inputtype) === 'undefined') {
            options.inputtype = 'normal';
        }
        options.parent = this;
        var newelem = new Emfgline(options);
        this.elements.push(newelem);
        this.elementsByName[newelem.name] = newelem;
        if (!unchanged) {
            this.changed(true);
        }
    }
    
    Emathfuncgraph.prototype.removeElement = function(index){
        // Remove index:th element
        delete this.elementsByName[this.elements[index].name];
        this.elements.splice(index, 1);
        this.addarea.find('li.emfg_element').eq(index).remove();
        this.drawElements();
        this.changed(true);
    }
    
    Emathfuncgraph.prototype.isEditable = function(){
        // Check if the funcgraph is editable. Authormode is always editable.
        return this.editable || this.authormode;
    }
    
    
    Emathfuncgraph.prototype.getData = function(options){
        var result = {
            type: "emathfuncgraph", 
            metadata: this.metadata, 
            data: {
                xscale: this.xscale,
                yscale: this.yscale,
                elements: [],
                listvisible: this.listvisible
            }
        };
        
        for (var i = 0; i < this.elements.length; i++){
            result.data.elements.push(this.elements[i].getData());
        }
        if (options) {
            options.result = result;
        }
        return result;

    }
    
    
    
    Emathfuncgraph.prototype.getAnswer = function(options){
        // Get data of all non-readonly objects.
        result = {
            elements: []
        };
        for (var i = 0; i < this.elements.length; i++) {
            if (!this.elements[i].isReadonly()) {
                result.elements.push(this.elements[i].getData());
            }
        }
        options.result = result;
        return result;
    }
    
    Emathfuncgraph.prototype.drawElements = function(){
        // (Re)draw all graphs of elements.
        if (this.board){
            JXG.JSXGraph.freeBoard(this.board);
        }
        this.displayarea.empty();
        this.construction = [];
        this.board = JXG.JSXGraph.initBoard(this.dispareaid, {grid: true, boundingbox: [this.xscale[0], this.yscale[1], this.xscale[1], this.yscale[0]], keepaspectratio: true, axis: false, showNavigation: this.isEditable(), showCopyright: false});
        this.board.create('axis', [[0,0],[1,0]],{ticks:{insertTicks: false, ticksDistance: 5, minTicksDistance: 10, majorHeight: 5, minorHeight: 0, strokeWidth: 2, strokeOpacity: 0.5}});
        this.board.create('axis', [[0,0],[0,1]],{ticks:{insertTicks: false, ticksDistance: 5, minTicksDistance: 10, majorHeight: 5, minorHeight: 0, strokeWidth: 2, strokeOpacity: 0.5}});
        this.board.suspendUpdate();
        // Draw invisible origo, unitpoints and vertical and horizontal lines.
        this.construction.push(this.board.construct('Origopoint(0,0) invisible; Xunitpoint(1,0) invisible; Yunitpoint(0,1) invisible; horizontalline=]Origopoint Xunitpoint[ invisible; verticalline=]Origopoint Yunitpoint[ invisible;'));
        this.elemstoshow = this.elements.slice(0);
        this.elemstoshow.reverse();
        var lastlength = this.elemstoshow.length + 1;
        while (lastlength > this.elemstoshow.length){
            // Draw all drawable elements, if dependencies are not met, postpone drawing and try again.
            // Keep drawing as long as something gets drawn.
            lastlength = this.elemstoshow.length;
            for (var i = lastlength-1; i > -1; i--){
                var success = true;
                if (this.hasElemsDrawn(this.elemstoshow[i].getDeps())){
                    success = this.elemstoshow[i].draw();
                } else {
                    success = false;
                }
                if (success){
                    this.elemstoshow.splice(i,1);
                }
            }
        }
        this.board.unsuspendUpdate();
        JXG.removeEvent(this.board.containerObj, "mousewheel", this.board.mouseWheelListener, this.board);
        JXG.removeEvent(this.board.containerObj, "DOMMouseScroll", this.board.mouseWheelListener, this.board);
    }
    
    Emathfuncgraph.prototype.changeColor = function($lielem, elemnum){
        // Show the color selector for given element.
        var emfuncgraph = this;
        var currentcolor = $lielem.find('a.emfg_elemtools_color').attr('color');
        var menuhtml = '<div class="colorselectwrapper"><ul class="colorselector emfg_gradbg">';
        for (var i = 0; i < Emathfuncgraph.colors.length; i++){
            var colorstr = Emathfuncgraph.colors[i];
            menuhtml += '<li class="'+(colorstr === currentcolor ? 'emfg_currentcolor' : '')+'"><a href="javascript:;" color="'+colorstr+'"><span></span></a></li>';
        }
        menuhtml += '</ul></div>';
        $lielem.append(menuhtml).find('.colorselector').hide().fadeIn(300).find('li a[color]').click(function(){
            // Init click handlers for buttons in color selector.
            var color = $(this).attr('color');
            emfuncgraph.setColor(elemnum, color);
            $lielem.find('a.emfg_elemtools_color[color]').attr('color', color).removeClass('isopen').focus();
            $(this).parents('div.colorselectwrapper').fadeOut(300, function(){$(this).remove()});
            emfuncgraph.changed(true);
        }).eq(0).focus();
        return true;
    }
    
    Emathfuncgraph.prototype.setColor = function(index, color){
        if (typeof(color) === 'undefined'){
            color = this.elements[index].getColor();
        }
        this.elements[index].setColor(color);
    }
    
    Emathfuncgraph.prototype.hasElemsDrawn = function(elemlist){
        var result = true;
        for (var i = 0; i < elemlist.length; i++){
            result = result && elemlist[i] !== '' && (typeof(this.board.elementsByName[elemlist[i]]) === 'object');
        }
        return result;
    }
    
    Emathfuncgraph.prototype.dragUpdate = function(){
        // Check all points, if they have been moved and update object and mathquill text, if needed.
        //var coords = {xcoord: 0, ycoord: 0};
        //var jsxcoords;
        var currelem;
        //var $listitem;
        var changed = false;
        for (var i = 0; i < this.elements.length; i++){
            currelem = this.elements[i];
            changed = currelem.dragUpdate() || changed;
        }
        if (changed){
            this.changed(true);
            this.draw();
        }
    }
    
    Emathfuncgraph.prototype.updateArea = function(){
        var bbox = this.board.getBoundingBox();
        if (this.xscale[0] != bbox[0] || this.xscale[1] != bbox[2] || this.yscale[0] != bbox[1] || this.yscale[1] != bbox[3]){
            var size = Math.min(bbox[2]-bbox[0], bbox[1]-bbox[3]);
            this.xscale[0] = bbox[0]; // left side
            this.yscale[1] = bbox[1]; // top side
            // To make the bounding box square, use same size for width and height.
            this.xscale[1] = this.xscale[0] + size;  // right side
            this.yscale[0] = this.yscale[1] - size;  // bottom side
        }
    }
    

    Emathfuncgraph.prototype.changed = function(updateMetadata){
        // Trigger a "element_changed"-event so that containing page/application/whatever knows to save
        // or do whatever it needs to do.
        //var e = jQuery.Event("element_changed");
        if (updateMetadata) {
                this.metadata.modifier = this.usersettings.username;
                this.metadata.modified = new Date();
        }
        this.place.trigger( 'element_changed' , {type: 'emathfuncgraph'}); 
    }
    
    Emathfuncgraph.latex2js = function(expression, needjs){
        // Simple conversion of LaTeX formulas to Javascript math-expression with at most one variable (x).
        // Functions that can be nested, should be replaced repeatedly from innermost to the outermost.
        var latexrep = [
            [/\\abs{([^{}]*)}/ig, 'abs($1)'],
            [/\\sqrt{([^{}]*)}/ig, 'sqrt($1)'],
            [/\\sqrt\[([0-9]+)\]{([^{}]*)}/ig, '((($2)/(abs($2)))^($1))*((((($2)/(abs($2)))^($1+1))*abs($2))^(1/$1))'],
            [/\\lg\\left\(([^\(\)]+)\\right\)/g, '((log($1))/(log(10)))'],
            [/\\log_(?:{([0-9]+)}|([0-9]))\\left\(([^\(\)]+)\\right\)/g, '((log($3))/(log($1$2)))'],
            [/\\left\|([^\|]*)\\right\|/g, 'abs($1)'],
            [/\\frac{([^{}]*)}{([^{}]*)}/ig, '(($1)/($2))']
        ];
        // Some LaTeX-markings need to be replaced only once.
        var reponce = [
            [/\\left\(/ig, '('],
            [/\\right\)/ig, ')'],
            [/\)\(/ig, ')*('],
            [/([0-9])\(/ig, '$1*('],
            [/\^([0-9])/ig, '^($1)'],
            [/\\sin/ig, 'sin'],
            [/\\cos/ig, 'cos'],
            [/\\tan/ig, 'tan'],
            [/\\ln/ig, 'log'],
            [/\\pi/ig, 'Pi'],
            [/([0-9])([a-z])/ig, '$1*$2'],
            [/{/ig, '('],
            [/}/ig, ')'],
            [/,/ig, '.'],
            [/\\cdot/ig, '*'],
            [/e/g, 'Exp(1)'],
            [/([0-9]+)Exp/g, '$1*Exp'],
            [/\)x/g, ')*x'],
            [/\)Pi/g, ')*Pi'],
            [/Pi Exp/g, 'Pi*Exp']
        ];
        var oldexpr = '';
        while (oldexpr !== expression){
            // Replace strings as long as the expression keeps changing.
            oldexpr = expression;
            for (var i = 0; i < latexrep.length; i++){
                expression = expression.replace(latexrep[i][0], latexrep[i][1]);
            }
        }
        for (var i = 0; i < reponce.length; i++){
            // Do one-time replacements.
            expression = expression.replace(reponce[i][0], reponce[i][1]);
        }
        var reg = /(?:[a-z$_][a-z0-9$_]*)|(?:[;={}\[\]"'!&<>\\?:])/ig,
            valid = true;
        expression = expression.replace(reg, function(word){
            // Check that all math functions / variables that can be found from Javascript's Math-object.
            if(word !=="x" && word !== "Pi" && word !== "Exp" && !Math.hasOwnProperty(word)){
                valid = false;
            }
            return word;
        });
        if (expression.indexOf('\\') != -1){
            // If there are still backslashes, there are still some LaTeX  commands that have not been replaced.
            valid = false;
        }
        return !valid ? "INVALID" : expression;
    }
    
    Emathfuncgraph.latexeval = function(expression){
        // Simple evaluator for math expressions. Converts LaTeX expression (without variables) to Javascript expression
        // and tries to evaluate it to a number.
        expression = '' + expression;
        // Functions that can be nested, should be replaced repeatedly from innermost to the outermost.
        var latexrep = [
            [/\\abs{([^{}]*)}/ig, 'abs($1)'],
            [/\\sqrt{([^{}]*)}/ig, 'sqrt($1)'],
            [/\\lg\\left\(([^\(\)]+)\\right\)/g, '((log($1))/(log(10)))'],
            [/\\frac{([^{}]*)}{([^{}]*)}/ig, '(($1)/($2))'],
            [/\\left\|([^\|]*)\\right\|/g, 'abs($1)'],
            [/((?:[0-9]+)|(?:\([^\(\)]\)))\^((?:[0-9])|(?:{[0-9]+}))/ig, 'pow($1, $2)']
        ]
        // Some LaTeX-markings need to be replaced only once.
        var reponce = [
            [/\\sin/ig, 'sin'],      // Replace sin
            [/\\cos/ig, 'cos'],      // Replace cos
            [/\\tan/ig, 'tan'],      // Replace tan
            [/\\ln/ig, 'log'],        // Replace ln
            [/\\pi/ig, 'PI'],        // Replace PI
            [/\\left\(/ig, '('],     // Replace left parenthesis )
            [/\\right\)/ig, ')'],    // Replace right parenthesis
            [/(sin|cos|tan)\(([^\^\)]+)\^{\\circ}/ig, '$1($2*PI/180'],  // Replace degrees with radians inside sin, cos and tan 
            [/{/ig, '('],            // Replace left bracket
            [/}/ig, ')'],            // Replace right bracket
            [/,/ig, '.'],            // Replace periods with points
            [/\)\(/ig, ')*('],       // Add times between ending and starting parenthesis )
            [/\\cdot/ig, '*'],       // Replace cdot with times
            [/([0-9]+)PI/ig, '$1*PI'],
            [/e/g, 'E'],
            [/([0-9]+)E/g, '$1*E'],
            [/EPI/g, 'E*PI'],
            [/PI E/g, 'PI*E']
        ]
        var oldexpr = '';
        while (oldexpr !== expression){
            // Replace strings as long as the expression keeps changing.
            oldexpr = expression;
            for (var i = 0; i < latexrep.length; i++){
                expression = expression.replace(latexrep[i][0], latexrep[i][1]);
            }
        }
        for (var i = 0; i < reponce.length; i++){
            expression = expression.replace(reponce[i][0], reponce[i][1]);
        }
        var reg = /(?:[a-z$_][a-z0-9$_]*)|(?:[;={}\[\]"'!&<>^\\?:])/ig,
            valid = true;
        expression = expression.replace(reg, function(word){
            if (Math.hasOwnProperty(word)){
                return 'Math.'+word;
            } else {
                valid = false;
                return word;
            }
        });
        if (!valid){
            throw 'Invalidexpression';
        } else {
            try {
                return (new Function('return ('+expression+')'))();
            } catch (err) {
                throw 'Invalidexpression';
            }
        }
    }
    
    // Available colors for points and function graphs.
    Emathfuncgraph.colors = [
        'red',
        'blue',
        'green',
        'orange',
        'darkviolet',
        'yellow',
        'brown',
        'black',
        'gray',
        'fuchsia',
        'lime',
        'navy',
        '#B5863B'
    ];
    
    // Some constant strings: css-styles,...
    Emathfuncgraph.strings = {
        style: '.emathfuncgraph {text-align: center;}'
            +'.emfuncgraphwrapper {display: inline-block; border: 1px solid black; position: relative; border-radius: 4px; text-align: left; white-space: nowrap; padding-bottom: 30px;}'
            +'.emathfuncgraph.emfg_listhidden .emfuncgraphaddarea {display: none;}'
            +'.emathfuncgraph label {cursor: pointer;}'
            +'.emfuncgraphdisplayarea {width: 400px; height: 400px; border: 1px solid #777; margin: 8px; background-color: white; box-shadow: inset 2px 2px 6px rgba(0,0,0,0.2), -1px -1px 1px #ccc, 1px 1px 1px #fff; border-radius: 4px; display: inline-block;}'
            +'.emfuncgraphaddarea {position: relative; display: inline-block; width: 380px; vertical-align: top; white-space: normal;}'
            +'.emfuncgraphaddarea ul {list-style: none; padding: 0; margin: 8px;}'
            +'.emfuncgraphaddarea ul.emfg_elemlist {max-height: 360px; height: 330px; background-color: #aaa; overflow-y: auto; overflow-x: hidden; border: 1px solid #999; border-radius: 4px; box-shadow: -1px -1px 1px #ccc, 1px 1px 1px #fff;}'
            +'.emfuncgraphaddarea li.emfg_element {margin: 0; padding: 0.1em 0 0.1em 0; border-bottom: 1px solid #999; border-top: 1px solid white; position: relative; min-height: 20px; overflow: visible;}'
            +'.emfuncgraphaddarea li.emfg_element .mathquill-editable {background-color: white; padding: 0.1em 0.3em; border: 1px solid #aaa;}'
            +'.emfuncgraphaddarea li.emfg_element .mathquill-editable.emfg_error {background-color: #fcc;}'
            +'.emfuncgraphdisplayarea svg {height: 100%; width: 100%;}'
            +'.emathfuncgraph[vertical="true"] .emfuncgraphwrapper {white-space: normal;}'
            +'.emathfuncgraph[vertical="true"] .emfuncgraphwrapper .emfuncgraphdisplayarea {display: block; width: 400px; height: 400px;}'
            +'.emathfuncgraph[vertical="true"] .emfuncgraphwrapper .emfuncgraphaddarea {display: block; width: auto;}'
            +'.emathfuncgraph[vertical="true"].emfg_listhidden .emfuncgraphwrapper .emfuncgraphaddarea {display: none;}'
            +'.emathfuncgraph[vertical="true"] .emfuncgraphwrapper .emfuncgraphaddarea ul.emfg_elemlist {height: auto;}'
            
            // Emathbook specific
            +'#contentWrapper[pageopen] .emathfuncgraph[vertical="false"] .emfuncgraphwrapper {white-space: normal;}'
            +'#contentWrapper[pageopen] .emathfuncgraph[vertical="false"] .emfuncgraphwrapper .emfuncgraphdisplayarea {display: block; width: 400px; height: 400px;}'
            +'#contentWrapper[pageopen] .emathfuncgraph[vertical="false"]:not(.emfg_listhidden) .emfuncgraphwrapper .emfuncgraphaddarea {display: block; width: auto;}'
            +'#contentWrapper[pageopen] .emathfuncgraph[vertical="false"] .emfuncgraphwrapper .emfuncgraphaddarea ul.emfg_elemlist {height: auto;}'
            
            
            
            +'ul.emfg_addpanel li.emfg_additem, ul.emfg_removepanel li.emfg_removeitem {display: inline-block;}'
            +'ul.emfg_addpanel li.emfg_additem a, ul.emfg_removepanel li.emfg_removeitem a {display: block; width: 30px; height: 20px; border: 1px solid #777; border-radius: 5px; margin-right: 8px; display: inline-block; box-shadow: -1px -1px 1px #ccc, 1px 1px 1px #fff;}'
            +'ul.emfg_addpanel {float: left; display: inline-block;}'
            +'ul.emfg_removepanel {float: right; display: inline-block;}'
            +'.emfg_gradbg {background: rgb(255,255,255); /* Old browsers */'
                +'background: -moz-linear-gradient(top,  rgba(255,255,255,1) 0%, rgba(229,229,229,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(255,255,255,1)), color-stop(100%,rgba(229,229,229,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(229,229,229,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(229,229,229,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(229,229,229,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(255,255,255,1) 0%,rgba(229,229,229,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr=\'#ffffff\', endColorstr=\'#e5e5e5\',GradientType=0 ); /* IE6-9 */}'
            +'.emathfuncgraph.emfuncgraph_editmode .emfuncgraphwrapper {padding-bottom: 0px;}'
            +'.emathfuncgraph .emfuncgraphtoolbar {position: absolute; right: 5px; bottom: 5px; margin: 0; padding: 0;}'
            +'.emathfuncgraph .emfuncgraphtoolbar li {display: inline-block; margin: 0 2px 0 0; padding: 0;}'
            +'.emathfuncgraph .emfuncgraphtoolbar input[type="checkbox"] {display: none;}'
            +'.emathfuncgraph a[addtype] span, .emathfuncgraph a.emfg_presentationmode_button span, .emathfuncgraph .emfuncgraphtoolbutton span, .emathfuncgraph .emfg_elemtools_lockelem span {display: block; width: 30px; height: 20px; margin: 0 auto; border-radius: 4px; background: transparent url(data:image/png;base64,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) 0 0 no-repeat;}'
            +'.emathfuncgraph a[addtype="point"] span {background-position: center 0;}'
            +'.emathfuncgraph a[addtype="function"] span {background-position: center -20px;}'
            +'.emathfuncgraph a[addtype="segment"] span {background-position: center -40px;}'
            +'.emathfuncgraph a[addtype="circle"] span {background-position: center -60px;}'
            +'.emathfuncgraph a[addtype="line"] span {background-position: center -80px;}'
            +'.emathfuncgraph a[addtype]:hover span, .emathfuncgraph .emfuncgraphtoolbar a:hover span, .emathfuncgraph .emfuncgraphtoolbar label:hover span, .emathfuncgraph .emfg_elemtools_lockelem:hover span, .emathfuncgraph .emfg_elemtools_removeelem:hover span, .emathfuncgraph .emfg_elemtools_color:hover span {background-color: rgba(255,255,255,0.5);}'
            +'.emathfuncgraph .emfg_elemtools_lockelem span {width: 20px; height: 20px; background-position: left 20px;}'
            +'.emathfuncgraph li[emfgelemtype="point"] .emfg_elemtools_lockelem span, .emathfuncgraph li[emfgelemtype="circle"] .emfg_elemtools_lockelem span, .emathfuncgraph li[emfgelemtype="segment"] .emfg_elemtools_lockelem span {width: 20px; height: 20px; background-position: left -180px;}'
            +'.emathfuncgraph li[emfg_locked="true"] .emfg_elemtools_lockelem span {width: 20px; height: 20px; background-position: left 20px;}'
            +'.emathfuncgraph.emfuncgraph_authormode li[emfg_locked="false"] .emfg_elemtools_lockelem span {width: 20px; height: 20px; background-position: left -160px;}'
            +'.emathfuncgraph.emfuncgraph_authormode li[emfg_locked="true"] .emfg_elemtools_lockelem span {width: 20px; height: 20px; background-position: left -140px;}'
            +'.emathfuncgraph .emfuncgraphtoolbar .emfuncgraphtoolbutton {display: inline-block; border: 1px solid #777; border-radius: 4px; margin: 3px 5px 3px 5px; box-shadow: -1px -1px 1px #ccc, 1px 1px 1px #fff;}'
            +'.emathfuncgraph a.emfg_presentationmode_button span {background-position: center -100px;}'
            +'.emathfuncgraph .emfg_presentation a.emfg_presentationmode_button span {background-position: center -120px;}'
            +'.emathfuncgraph a.emfuncgraphsettings span {background-position: center -200px;}'
            +'.emathfuncgraph label.emfuncgraphviewmode span {background-position: center -220px;}'
            +'.emathfuncgraph li[emfg_listhidden="true"] label.emfuncgraphviewmode span {background-position: center -240px;}'
            +'.emathfuncgraph label.emfuncgrapheditmode span {background-position: center -320px;}'
            +'.emathfuncgraph li[emfg_iseditable="true"] label.emfuncgrapheditmode span {background-position: center -300px;}'
            +'.emathfuncgraph .emfg_element_content {display: inline-block; margin-left: 0.2em; margin-right: 55px;}'
            +'.emathfuncgraph .emfg_elemtools {display: inline-block; margin: 2px 0.5em 2px 2px; padding: 0;}'
            +'.emathfuncgraph .emfg_elemtools_right {position: absolute; right: 2px; top: 2px; display: inline-block; margin: 2px; padding: 0;}'
            +'.emathfuncgraph .emfg_elemtools_right input.emfg_lockcheck {display: none;}'
            +'.emathfuncgraph .emfg_options_showhide {display: block; text-align: center; text-decoration: none; color: black; font-size: 100%; text-shadow: -1px -1px 1px rgba(0,0,0,0.5), 1px 1px 1px rgba(255,255,255,0.5); line-height: 0.3em; height: 0.6em; overflow: hidden;}'
            +'.emathfuncgraph .emfg_options_showhide:hover {background-color: rgba(255,255,255,0.7);}'
            +'.emathfuncgraph .emfgitem_options {background-color: white; border-radius: 0px; box-shadow: inset 0px 2px 3px rgba(0,0,0,0.3); margin: 0 0.1em 0.4em 0.1em; padding: 0.3em; border: 1px solid #aaa;}'
            //+'.emathfuncgraph li.emfg_element[emfg_readonly="true"] .emfg_elemtools_right {visibility: hidden;}'
            +'.emathfuncgraph li.emfg_element[emfg_readonly="true"] .emfg_elemtools_color, .emathfuncgraph ul[emfg_editable="false"] li.emfg_element .emfg_elemtools_color {background: transparent; border: 1px solid transparent; cursor: default; box-shadow: none;}'
            +'.emathfuncgraph .emfg_range {display: inline-block; margin-left: 1.5em; padding: 0 0.2em; position: absolute; right: 1em; bottom: 0.2em; font-size: 70%;}'
            +'.emathfuncgraph .emfg_elemtools_color, .emathfuncgraph .colorselector li a[color], .emathfuncgraph .emfg_elemtools_removeelem, .emathfuncgraph.emfuncgraph_authormode .emfg_elemtools_lockelem {display: inline-block; width: 20px; height: 20px; border: 1px solid #999; border-radius: 4px; position: relative; box-shadow: 0 0 1px rgba(0,0,0,0.5); box-shadow: -1px -1px 1px #ccc, 1px 1px 1px #fff; cursor: pointer;}'
            +'.emathfuncgraph .emfg_elemtools_lockelem {display: inline-block; width: 20px; height: 20px; border-radius: 4px; position: relative; cursor: default;}'
            +'.emathfuncgraph .colorselector li a[color] {display: block;}'
            +'.emathfuncgraph .colorselector li.emfg_currentcolor a[color] {background-color: rgba(0,0,0,0.3); border-top: 1px solid #555; border-left: 1px solid #555;}'
            +'.emathfuncgraph .emfg_elemtools_color.isopen {border-color: red; background: #aaa;}'
            +'.emathfuncgraph .emfg_elemtools_color span, .emathfuncgraph .colorselector a[color] span {display: inline-block; width: 16px; height: 16px; border-radius: 8px; position: absolute; top: 2px; left: 2px;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="red"] span, .emathfuncgraph .colorselector a[color="red"] span {background-color: red;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="blue"] span, .emathfuncgraph .colorselector a[color="blue"] span {background-color: blue;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="green"] span, .emathfuncgraph .colorselector a[color="green"] span {background-color: green;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="orange"] span, .emathfuncgraph .colorselector a[color="orange"] span {background-color: orange;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="darkviolet"] span, .emathfuncgraph .colorselector a[color="darkviolet"] span {background-color: darkviolet;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="yellow"] span, .emathfuncgraph .colorselector a[color="yellow"] span {background-color: yellow;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="brown"] span, .emathfuncgraph .colorselector a[color="brown"] span {background-color: brown;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="black"] span, .emathfuncgraph .colorselector a[color="black"] span {background-color: black;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="gray"] span, .emathfuncgraph .colorselector a[color="gray"] span {background-color: gray;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="lime"] span, .emathfuncgraph .colorselector a[color="lime"] span {background-color: lime;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="fuchsia"] span, .emathfuncgraph .colorselector a[color="fuchsia"] span {background-color: fuchsia;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="navy"] span, .emathfuncgraph .colorselector a[color="navy"] span {background-color: navy;}'
            +'.emathfuncgraph .emfg_elemtools_color[color="#B5863B"] span, .emathfuncgraph .colorselector a[color="#B5863B"] span {background-color: #B5863B;}'
            +'.emathfuncgraph ul.colorselector {list-style: none; position: absolute; top: -6px; left: -7px; width: auto; padding: 2px; border: 1px solid #777; border-radius: 4px; z-index: 10; box-shadow: 4px 4px 4px rgba(0,0,0,0.5);}'
            +'.emathfuncgraph ul.colorselector li {display: inline-block; padding: 0; margin: 0;}'
            +'.emathfuncgraph .emfg_elemtools_removeelem span {display: block; width: 20px; height: 20px; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAElQAABJUBWL5jxAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAF1SURBVDiNrdQ9i1NBFMbx37kJi+DCam1KIYr6ASwEOy1EsHYLwS9ibS3Y2dn7RUR8BastXF8KSQLuanSzORZ3gtckN8mip5rzMv85z8xwIjP9T+uuK3gTcb/iAnLK3uXMxycCvorod7k684PdKc+Co+Duu4gfs9wxz69kvl4J7NLHvQZQcKe4k2auwy+sBk55gQerZDWA75c09LcFt/FIffpWCR/V+1XFH+NUsounzf2VOQuGkNwK9krsIZ6U9ceKG83alUAMSmKcfC2xg+CwrL9M6o4dM9oEODv1NA7mk8mow85cbTuw+lO0vQyI0bQAqw2BgwbwcD4fjCrOwNYmwE/lXrJF8pRR1h2Oz2f+XAu8njnBNy2Sg1HUwIXulgKLDbAdLZKzlnwi4NB6yQtfZh2w9ZWDnWWfehVwoOWVq7qzVslt83AYXMN3yHqcnS25m0G/DJEFi2UT+2XEuQ6X0KvoJb2aaz/4EOzj7cXMzxsB/8V+A2xJeyQvlXgTAAAAAElFTkSuQmCC) center center no-repeat;}'
            +'.emfuncgraphwrapper.emfg_presentation {position: fixed; top: 1em; right: 1em; bottom: 1em; left: 1em; font-size: 120%; padding: 0.5em; z-index: 1000;}'
            +'.emfuncgraphwrapper.emfg_presentation .emfuncgraphaddarea {position: absolute; right: 0.2em; top: 0.2em; bottom: 0.2em; width: 30%; box-sizing: border-box;}'
            +'.emfuncgraphwrapper.emfg_presentation .emfuncgraphaddarea ul.emfg_elemlist {max-height: none; height: auto; position: absolute; top: 0; right: 0; left: 0; bottom: 80px; border: 1px solid #777;}'
            +'.emfuncgraphwrapper.emfg_presentation .emfuncgraphaddarea .emfg_addpanel {position: absolute; left: 0; bottom: 30px; right: 0;}'
            +'.emfuncgraphwrapper.emfg_presentation .emfuncgraphdisplayarea {position: static; margin: 0; margin-right: auto; width: 70%; height: 100%; display: block; box-sizing: border-box;}'
            +'.emfg_listhidden .emfuncgraphwrapper.emfg_presentation .emfuncgraphdisplayarea {width: 100%;}'
            +'.emathfuncgraph .JXGtext {font-family: times, serif; font-size: 100%!important;}'
    }

    
    /******
     * Default settings. 
     ******/
    Emathfuncgraph.defaults = {
        type: 'emathfuncgraph',
        metadata: {
            creator: '',
            created: '',
            modifier: '',
            modified: '',
            tags: []
        },
        data: {
            "xscale": [
                -10,
                10
            ],
            "yscale": [
                 -10,
                 10
            ],
            "elements": [],
            listvisible: true
        },
        settings: {
            mode: 'view',
            preview: false,
            uilang: 'en',
            theme: 'default_theme',
            decimalperiod: false,
            vertical: false,
            presentation: false
        }
    }

    Emathfuncgraph.elementinfo = {
        type : 'emathfuncgraph',
        elementtype : ['elements','studentelements'],
        jquery : 'emathfuncgraph',
        name : 'Function graph',
        icon : '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewBox="0 0 30 30" class="mini-icon mini-icon-functiongraph"><path style="stroke: none;" d="M1 17 l26 0 l0 -2 l3 2.5 l-3 2.5 l0 -2 l-26 0z M13 29 l0 -26 l-2 0 l2.5 -3 l2.5 3 l-2 0 l0 26z M1 29 q5 -28 14 -17 q7 7 12 -10 l1 0 q-5 19 -14 10 q-8 -8 -12 17z" /></svg>',
        description : {
            en : 'Function graphs',
            fi : 'Funktiopiirturit'
        },
        classes : [ 'math', 'content' ]
    }

    // For possible listing/registration to elementset
    if (typeof ($.fn.elementset) === 'function') {
        $.fn.elementset('addelementtype', Emathfuncgraph.elementinfo);
    }
    
    if (typeof($.fn.elementpanel) === 'function') {
        $.fn.elementpanel('addelementtype', Emathfuncgraph.elementinfo);
    }
    
    
    /************************************************
     * Emfgelement -class
     * Parent class for elements in graph.
     * All elements inherit prototypes from this class.
     ************************************************/
    var Emfgelement = function(options){
        // General constructor for elements
    }
    
    // Reference to the parent class so that parent's methods can be used.
    Emfgelement.prototype.parentClass = Emfgelement.prototype;
    
    Emfgelement.prototype.changed = function(){
        // Signal the change
        this.parent.changed(true);
        this.isDirty = false;
    }
    
    Emfgelement.prototype.redrawAll = function(){
        // Redraw all elements.
        this.parent.drawElements();
    }
    
    Emfgelement.prototype.getLabel = function(){
        // Get the label of the element in LaTex
        return this.name;
    }
    
    Emfgelement.prototype.getData = function(){
        // Get the data as an object for saving of what ever.
        var result = {
            type: this.type,
            name: this.name,
            color: this.color,
            readonly: this.readonly
        }
        return result;
    }
    
    Emfgelement.prototype.getDeps = function(){
        // Return the list of names of elements this element depends of.
        // (Elements that are needed before this can be drawn.)
        return [];
    }

    Emfgelement.prototype.getColor = function(){
        // Get the current color of this element.
        return this.color;
    }

    Emfgelement.prototype.isReadonly = function(){
        // Check if this function is readonly
        return this.readonly;
    }
    
    Emfgelement.prototype.isInvalid = function(){
        // Check if this element is in invalid state. For default: always false.
        return false;
    }
    
    Emfgelement.prototype.initExtraOptions = function(){
        // Init function for eventhandlers of extra options for this element. Dummy default.
        return true;
    }
    
    Emfgelement.prototype.dragUpdate = function(){
        // Check if the element has been dragged and update data and picture.
        // By default do nothing.
        return false;
    }

    Emfgelement.prototype.markErrors = function(){
        var $mqelems = this.listitem.find('.mathquill-editable');
        if (!this.valid){
            for (var i = 0; i < this.invalids.length; i++){
                $mqelems.eq(this.invalids[i]).addClass('emfg_error');
            }
        } else {
            $mqelems.removeClass('emfg_error');
        }
    }
    
    Emfgelement.prototype.draw = function(){
        // Draw this element.
        var element = this;
        var board = this.parent.board;
        var construction = this.parent.construction;
        var success = false;
        if (this.isInvalid()){
            return false;
        }
        var drawops = this.getDrawOptions();
        for (var i = 0; i < drawops.length; i++){
            if (this.parent.presentation){
                drawops[i].options.strokeWidth = 2* drawops[i].options.strokeWidth;
            }
            try {
                var constr = {};
                constr[drawops[i].options.name] = board.create(drawops[i].drawtype, drawops[i].parents, drawops[i].options);
                construction.push(constr);
                success = true;
            } catch (err){
                // If jsxgraph could not draw.
                if (this.listitem){
                    this.listitem.find('.mathquill-editable').addClass('emfg_error');
                }
                success = false;
            }
        }
        return success;
    }
    
    Emfgelement.prototype.drawEditItem = function($elemitem){
        // Draw the list item on the elementlist.
        var element = this;
        var elemlist = this.parent.elemlist;
        if ($elemitem){
            this.listitem = $elemitem;
        }
        if (!this.listitem){
            return false;
        }
        this.listitem.addClass('emfg_element emfg_gradbg')
            .attr('emfgelemtype', this.type)
            .attr('emfgelemname',this.name)
            .attr('emfg_readonly',(this.isReadonly() && !this.parent.authormode))
            .attr('emfg_locked', (this.isReadonly() && this.parent.authormode));
        var elemsettings = this.getEditItem();
        this.listitem.html(elemsettings);
        this.listitem.find('.mathquill-editable:not(mathquill-rendered-math)').mathquill('editable');
        this.listitem.find('.mathquill-embedded-latex:not(mathquill-rendered-math)').mathquill();
        this.listitem.find('.mathquill-editable');
        this.listitem.find('.emfg_element_content .mathquill-editable').bind('focusout.emfg', function(e){
            var error = false;
            var $mqelem = $(this);
            var data = element.getInputData();
            element.setElement(data);
            element.markErrors();
            if (element.isDirty) {
                element.changed();              
                element.redrawAll();
            }
        });
        this.listitem.find('.mathquill-editable').bind('keyup.emfg', function(e){
            // Enter sends focusout and blur events for mathquill boxes.
            if (e.which == 13){
                $(this).focusout();
            }
        });
        this.listitem.find('.emfgitem_options').hide();
        this.listitem.find('a.emfg_options_showhide').click(function(){
            if ($(this).hasClass('open')){
                $(this).removeClass('open').prev().slideUp('fast');
            } else {
                $(this).addClass('open').prev().slideDown('fast');
            }
        });
        this.listitem.find('a.emfg_elemtools_removeelem').click(function(e){
            // Click on remove button to remove this item.
            var $lielem = $(this).parents('li.emfg_element');
            var elindex = $lielem.index();
            if (confirm('You are about to remove '+element.type+': '+element.name)){
                element.parent.removeElement(elindex);
            }
        });
        this.listitem.filter('[emfg_readonly="false"]').find('.emfg_elemtools a.emfg_elemtools_color').click(function(e){
            // Click on color chooser.
            var $lielem = $(this).addClass('isopen').parents('li.emfg_element');
            var elindex = $lielem.index();
            element.parent.changeColor($lielem, elindex);
        });
        this.initExtraOptions();
        if (this.parent.authormode) {
            this.initAuthorEvents();
        }
        return true;
    }
    
    Emfgelement.prototype.drawShowItem = function($elemitem){
        // Draw the list item on the elementlist in show mode.
        var elemlist = this.parent.elemlist;
        this.listitem = $elemitem;
        this.listitem.addClass('emfg_element emfg_gradbg')
            .attr('emfgelemtype', this.type)
            .attr('emfgelemname',this.name)
            .attr('emfg_readonly',this.isReadonly())
            .attr('emfg_locked', this.isReadonly() && !this.parent.authormode);
        var elemsettings = this.getShowItem();
        this.listitem.html(elemsettings);
        this.listitem.find('.mathquill-embedded-latex:not(mathquill-rendered-math)').mathquill();
    }
    
    Emfgelement.prototype.lockHtml = function(authormode){
        // Return the html-code for lock symbol and checkbox.
        var lockstring =  [
            '<span class="emfg_lock_options">',
            (authormode ? '<input type="checkbox" id="emfg_'+this.type+'_'+this.simplename+'_locked" class="emfg_lockcheck" '+(this.readonly ? 'checked="checked" ' : '')+'/>' : ''),
            '<label class="emfg_elemtools_lockelem'+(this.parent.authormode ? ' emfg_gradbg' : '')+'" for="emfg_'+this.type+'_'+this.simplename+'_locked"><span></span></label>',
            '</span>'
        ].join('');
        return lockstring;
    }

    Emfgelement.prototype.initAuthorEvents = function(){
        // Init events that are used in author mode.
        var element = this;
        this.listitem.find('#emfg_'+this.type+'_'+this.simplename+'_locked').change(function(){
            element.readonly = $(this).is(':checked');
            element.listitem.attr('emfg_locked', element.readonly);
            element.changed();
            element.redrawAll();
        });
    }
   
    /************************************************
     * Emfgfunction -class
     * Function elements in graph
     ************************************************/
    var Emfgfunction = function(options){
        // Representation of a function
        this.type = 'function';
        this.isDirty = false;
        this.name = options.name;
        this.simplename = this.name.replace(/[{}]/g, '');
        this.latex = options.latex;
        this.color = options.color || 'blue';
        this.min = options.min || '';
        this.max = options.max || '';
        this.readonly = !!options.readonly;
        this.parent = options.parent;
        if (this.latex && !this.js){
            this.js = Emathfuncgraph.latex2js(this.latex);
        }
    }

    // Inherit prototypes from Emfgelement, override constructor with own one.
    Emfgfunction.prototype = new Emfgelement();
    Emfgfunction.prototype.constructor = Emfgfunction;
    
    Emfgfunction.prototype.getLabel = function(){
        // Get the label of the value of function as name(x) in LaTeX
        return this.name + '\\left(x\\right)';
    }
    
    Emfgfunction.prototype.getData = function(){
        // Get all data of the function as an object.
        // Use the default fields defined in parent class and add some own fields.
        var result = this.parentClass.getData.call(this);
        result.latex = this.latex;
        result.max = this.max;
        result.min = this.min;
        return result;
    }
    
    Emfgfunction.prototype.setFunction = function(latex){
        // Set the function from LaTeX string. Normalize the decimal separator to '.'.
        this.valid = true;
        
        this.invalids = [];

        latex = latex.replace(/,/g, '.');
        this.isDirty = !(this.latex === latex);
        this.latex = latex;
        if (this.latex){
            this.js = Emathfuncgraph.latex2js(this.latex);
        } else {
            this.js = 'INVALID';
        }
        if (this.isInvalid()){
            this.valid = false;
            this.invalids = [0];
        }
    }
    
    // Common alias for set-method.
    Emfgfunction.prototype.setElement = Emfgfunction.prototype.setFunction;
    
    Emfgfunction.prototype.getLatex = function(){
        // Get the function definition in latex. Localize the decimal separator, if needed.
        result = this.latex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g,',');
        }
        return result;
    }
    
    Emfgfunction.prototype.setColor = function(color){
        // Set the color of function graph.
        var board = this.parent.board;
        if (typeof(color) !== 'undefined'){
            this.color = color;
        } else {
            this.color = this.color || 'blue';
        }
        if (board.elementsByName[this.name]) {
            board.elementsByName[this.name].setProperty({strokeColor: this.color});
        }
    }

    Emfgfunction.prototype.setMin = function(minimum){
        // Set minimum of the range.
        if (typeof(minimum) === 'undefined'){
            minimum = '';
        }
        minimum = minimum.replace(/,/g,'.');
        this.isDirty = this.min !== minimum;
        this.min = minimum;
        if (minimum === ''){
            return -Infinity;
        }
        var result = false;
        try {
            result = Emathfuncgraph.latexeval(minimum);
        } catch (err){
            result = false;
        }
        return result;
    }

    Emfgfunction.prototype.getMin = function(){
        // Get minimum of the range.
        var result;
        try {
            result = Emathfuncgraph.latexeval(this.min);
        } catch (err){
            result = -Infinity;
        }
        return result;
    }

    Emfgfunction.prototype.getMinLatex = function(){
        // Get minimum of the range as Latex.
        var result = this.min;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgfunction.prototype.setMax = function(maximum){
        // Set maximum of the range.
        if (typeof(maximum) === 'undefined'){
            maximum = '';
        }
        maximum = maximum.replace(/,/g, '.');
        this.isDirty = this.max !== maximum;
        this.max = maximum;
        if (maximum === ''){
            return Infinity;
        }
        var result = false;
        try {
            result = Emathfuncgraph.latexeval(maximum);
        } catch (err){
            result = false;
        }
        return result;
    }

    Emfgfunction.prototype.getMax = function(){
        // Get maximum of the range.
        var result;
        try {
            result = Emathfuncgraph.latexeval(this.max);
        } catch (err){
            result = Infinity;
        }
        return result;
    }

    Emfgfunction.prototype.getMaxLatex = function(){
        // Get maximum of the range as Latex.
        var result = this.max;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgfunction.prototype.getRange = function(){
        // Get the range of function as LaTeX-string
        var range = '';
        var rbefore = '(';
        var rafter = ')';
        if (this.getMin() !== -Infinity){
            rbefore += (this.getMinLatex() + ' \\lt ');
        }
        if (this.getMax() !== Infinity){
            rafter = (' \\lt ' + this.getMaxLatex()) + rafter;
        }
        if (this.getMin() !== -Infinity || this.getMax() !== Infinity){
            range = rbefore + 'x' + rafter;
        }
        return range;
    }

    Emfgfunction.prototype.isInvalid = function(){
        // Check if Javascript of this function is invalid.
        return this.js === 'INVALID';
    }

    Emfgfunction.prototype.getJessie = function(){
        // Get the JessieScript string for this element.
        var jessie = this.name + ':' + this.js +';';
        return jessie;
    }

    Emfgfunction.prototype.getDrawOptions = function(){
        // Get options that are used for drawing.
        var element = this;
        var result = {};
        result.options = {
            name: this.name,
            fixed: this.isReadonly,
            strokeWidth: 1.5,
            strokeColor: this.color
        };
        result.drawtype = 'functiongraph';
        var funcstring;
        try {
            funcstring = JXG.GeonextParser.geonext2JS(element.js);
        } catch (err){
            funcstring = '\'invalid expression\'';
        }
        result.parents = [
            new Function('x','return (' + funcstring +');'),
            (this.getMin()>-Infinity ? this.getMin(): null),
            (this.getMax()<Infinity ? this.getMax() : null)
        ];
        return [result];
    }

    Emfgfunction.prototype.getEditItem = function(){
        // Return the html-string for this element's item in list in edit mode.
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<a href="javascript:;" class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'"><span></span></a>',
            '</div>',
            '<div class="emfg_element_content">',
            '<span class="mathquill-embedded-latex">'+ this.getLabel() + '=\\editable{' + this.getLatex() +'}</span>',
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '<a href="javascript:;" class="emfg_elemtools_removeelem emfg_gradbg"><span></span></a>',
            '</div>',
            '<div class="emfgitem_options emfg_function_options">',
            '<div><span class="mathquill-editable" emfg-value="min" id="emfg_function_'+this.simplename+'_min" >'+ this.getMinLatex()+'</span>',
            ' &lt; x &lt; <span class="mathquill-editable" emfg-value="max" id="emfg_function_'+this.simplename+'_max" >'+this.getMaxLatex()+'</span></div>',
            '</div>',
            '<a href="javascript:;" class="emfg_options_showhide">...</a>',
        ].join('\n');
        return elemsettings;
    }

    Emfgfunction.prototype.getInputData = function(){
        // Get input data from mathquill elements.
        var $mqelems = this.listitem.find('.mathquill-editable');
        var data = $mqelems.mathquill('latex');
        return data;
    }

    Emfgfunction.prototype.getShowItem = function(){
        // Return the html-string for this element's item in list in show mode.
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<span class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'">',
            '<span></span></span>',
            '</div>',
            '<div class="emfg_element_content">',
            '<span class="mathquill-embedded-latex">'+ this.getLabel() + '=' + this.getLatex() +'</span><div class="emfg_range"><span class="mathquill-embedded-latex">'+this.getRange()+'</span></div>',
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '</div>',
        ].join('\n');
        return elemsettings;
    }

    Emfgfunction.prototype.initExtraOptions = function(){
        // Init events for the extra options of this element.
        var element = this;
        this.listitem.find('.emfgitem_options #emfg_function_'+this.simplename+'_min, .emfgitem_options #emfg_function_'+this.simplename+'_max').bind('focusout.emfg', function(e){
            var error = false;
            var $mqelem = $(this);
            var minmax = $mqelem.attr('emfg-value');
            var latex = $mqelem.mathquill('latex');
            var value;
            switch (minmax) {
                case 'min':
                    value = element.setMin(latex);
                    break;
                case 'max':
                    value = element.setMax(latex);
                    break;
                default:
                    break;
            }
            if (typeof(value) === 'number'){
                $mqelem.removeClass('emfg_error');
                if (element.isDirty) {
                        element.changed();              
                        element.redrawAll();
                }

            } else {
                $mqelem.addClass('emfg_error');
            }
        });
    }

    
    /************************************************
     * Emfgpoint -class
     * Point elements in graph
     ************************************************/

    var Emfgpoint = function(options){
        // Representation of a point.sipikuja 214
        this.type = 'point';
        this.name = options.name;
        this.simplename = this.name.replace(/[{}]/g, '');
        this.xcoordLatex = ''+options.xcoord || '0';
        this.ycoordLatex = ''+options.ycoord || '0';
        this.color = options.color || 'red';
        this.readonly = !!options.readonly;
        this.parent = options.parent;
        this.setPoint({xcoord: this.xcoordLatex, ycoord: this.ycoordLatex});
        this.isDirty = false;
    }
    
    // Inherit prototypes from Emfgelement, override constructor with own one.
    Emfgpoint.prototype = new Emfgelement();
    Emfgpoint.prototype.constructor = Emfgpoint;

    Emfgpoint.prototype.getData = function(){
        // Get all data of the point.
        // Use the default fields defined in parent class and add some own fields.
        var result = this.parentClass.getData.call(this);
        result.xcoord = this.xcoordLatex;
        result.ycoord = this.ycoordLatex;
        return result;
    }

    Emfgpoint.prototype.setPoint = function(options){
        // Set point's coordinates. Normalize decimal separator to '.'.
        this.valid = true;
        this.invalids = [];
        options.xcoord = (''+options.xcoord).replace(/,/g, '.');
        options.ycoord =  (''+options.ycoord).replace(/,/g, '.');
        this.isDirty = !(this.xcoordLatex === options.xcoord && this.ycoordLatex === options.ycoord);
        this.xcoordLatex = options.xcoord;
        this.ycoordLatex = options.ycoord;
        
        
        try {
            this.xcoord = Emathfuncgraph.latexeval(this.xcoordLatex);
        } catch (err) {
            this.valid = false;
            this.invalids.push(0);
        }
        try {
            this.ycoord = Emathfuncgraph.latexeval(this.ycoordLatex);
        } catch (err) {
            this.valid = false;
            this.invalids.push(1);
        }
        return this.valid;
    }
    
    // Common alias for set-method.
    Emfgpoint.prototype.setElement = Emfgpoint.prototype.setPoint;

    Emfgpoint.prototype.getXstring = function(){
        // Get xcoord as a Jessiescriptable string
        return (''+(Math.round(this.xcoord * 10000000)/10000000));
    }

    Emfgpoint.prototype.getYstring = function(){
        // Get ycoord as a Jessiescriptable string
        return (''+(Math.round(this.ycoord * 10000000)/10000000));
    }

    Emfgpoint.prototype.getXlatex = function(){
        // Get point's x-coordinate as LaTeX. Localize the decimal separator, if needed.
        result = this.xcoordLatex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g,',');
        }
        return result;
    }

    Emfgpoint.prototype.getYlatex = function(){
        // Get point's y-coordinate as LaTeX. Localize the decimal separator, if needed.
        result = ''+this.ycoordLatex;
        if (this.parent.decimalperiod){
            result = result.replace('.',',');
        }
        return result;
    }

    Emfgpoint.prototype.setColor = function(color){
        // Set the color of the point.
        var board = this.parent.board;
        if (typeof(color) !== 'undefined'){
            this.color = color;
        } else {
            this.color = this.color || 'red';
        }
        board.elementsByName[this.name].setProperty({strokeColor: this.color, fillColor: this.color});
    }

    Emfgpoint.prototype.getJessie = function(){
        // Get the JessieScript string for this element.
        var jessie = this.name + '(' + this.xcoord + ',' + this.ycoord + '); ';
        return jessie;
    }

    Emfgpoint.prototype.getDrawOptions = function(){
        // Get options that are used for drawing.
        var result = {};
        result.options = {
            name: this.name,
            strokeColor: this.color,
            fillColor: this.color,
            fixed: this.readonly,
            face: (this.readonly ? '[]' : 'o'),
            strokeWidth: 1
        };
        result.drawtype = 'point';
        result.parents = [this.xcoord, this.ycoord];
        return  [result];
    }

    Emfgpoint.prototype.getEditItem = function(){
        // Return the html-string for this element's item in list in edit mode.
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<a href="javascript:;" class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'"><span></span></a>',
            '</div>',
            '<div class="emfg_element_content">',
            '<span class="mathquill-embedded-latex">' + this.getLabel() + '= \\left(\\editable{' + this.getXlatex() + '}\\:,\\:\\editable{'+ this.getYlatex() + '}'+'\\right)</span>',
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '<a href="javascript:;" class="emfg_elemtools_removeelem emfg_gradbg"><span></span></a>',
            '</div>',
        ].join('\n');
        return elemsettings;
    }

    Emfgpoint.prototype.getInputData = function(){
        // Get input data from mathquill elements.
        var $mqelems = this.listitem.find('.mathquill-editable');
        var data = {
            xcoord: $mqelems.eq(0).mathquill('latex'),
            ycoord: $mqelems.eq(1).mathquill('latex')
        }
        return data;
    }

    Emfgpoint.prototype.getShowItem = function(){
        // Return the html-string for this element's item in the list in show mode.
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<span class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'">',
            '<span></span></span>',
            '</div>',
            '<div class="emfg_element_content">',
            '<span class="mathquill-embedded-latex">' + this.getLabel() + '= \\left('+ this.getXlatex() + '\\:,\\:' + this.getYlatex() + '\\right)</span>',
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '</div>',
        ].join('\n');
        return elemsettings;
    }

    Emfgpoint.prototype.dragUpdate = function(){
        // Update the point after dragging.
        var board = this.parent.board;
        var changed = false;
        var jsxcoords = board.elementsByName[this.name].coords.usrCoords;
        var coords = {xcoord: jsxcoords[1], ycoord: jsxcoords[2]};
        if (coords.xcoord !== this.xcoord || coords.ycoord !== this.ycoord){
            coords.xcoord = Math.round(coords.xcoord * 100) / 100;
            coords.ycoord = Math.round(coords.ycoord * 100) / 100;
            this.setPoint(coords);
            changed = true;
        }
        return changed;
    }


    /************************************************
     * Emfgsegment -class
     * Segment elements between two points in graph
     ************************************************/
    
    var Emfgsegment = function(options){
        // Representation of a segment
        this.type = 'segment';
        this.name = options.name;
        this.simplename = this.name.replace(/[{}]/g, '');
        this.point1 = options.point1 || '';
        this.point2 = options.point2 || '';
        this.color = options.color || 'green';
        this.readonly = options.readonly || false;
        this.parent = options.parent;
        this.showxdiff = options.showxdiff || false;
        this.showydiff = options.showydiff || false;
        this.showdxdyvalue = options.showdxdyvalue || false;
        this.showlength = options.showlength || false;
        this.isDirty = false;
    }
    
    // Inherit prototypes from Emfgelement, override constructor with own one.
    Emfgsegment.prototype = new Emfgelement();
    Emfgsegment.prototype.constructor = Emfgpoint;
    
    Emfgsegment.prototype.getData = function(){
        // Get all data of the segment.
        // Use the default fields defined in parent class and add some own fields.
        var result = this.parentClass.getData.call(this);
        result.point1 = this.point1;
        result.point2 = this.point2;
        result.showxdiff = this.showxdiff;
        result.showydiff = this.showydiff;
        result.showdxdyvalue = this.showdxdyvalue;
        result.showlength = this.showlength;
        return result;
    }

    Emfgsegment.prototype.setSegment = function(options){
        // Set the endpoints of segment.
        this.valid = true;
        this.invalids = [];
        this.isDirty = (options.point1 !== this.point1 || options.point2 !== this.point2);
        this.point1 = options.point1;
        this.point2 = options.point2;
        if (this.point1 === '' || !this.parent.board.elementsByName.hasOwnProperty(this.point1)){
            this.valid = false;
            this.invalids.push(0);
        }
        if (this.point2 === '' || !this.parent.board.elementsByName.hasOwnProperty(this.point2)){
            this.valid = false;
            this.invalids.push(1);
        }
    }
    
    // Common alias for set-method.
    Emfgsegment.prototype.setElement = Emfgsegment.prototype.setSegment;
    
    Emfgsegment.prototype.showxdiff = function(onoff){
        // Show or hide dx. (true or null == show, false == hide)
        if (typeof(onoff) === 'undefined'){
            onoff = true;
        }
        this.showxdiff = onoff;
    }

    Emfgsegment.prototype.showydiff = function(onoff){
        // Show or hide dy. (true or null == show, false == hide)
        if (typeof(onoff) === 'undefined'){
            onoff = true;
        }
        this.showydiff = onoff;
    }

    Emfgsegment.prototype.getDeps = function(){
        // Return the list of names of elements this element depends of.
        // (Elements that are needed before this can be drawn.)
        return [this.point1, this.point2];
    }

    Emfgsegment.prototype.setColor = function(color){
        // Set the color of the segment.
        var board = this.parent.board;
        if (typeof(color) !== 'undefined'){
            this.color = color;
        } else {
            this.color = this.color || 'green';
        }
        if (board.elementsByName[this.name]){
            board.elementsByName[this.name].setProperty({strokeColor: this.color});
        }
    }

    Emfgsegment.prototype.getJessie = function(){
        // Get the JessieScript string for this element.
        var jessie = this.name + '=[' + this.point1 + ' ' + this.point2 + ']; ';
        if (this.showxdiff || this.showydiff){
            jessie += this.name+'_hline=||('+this.point1+',horizontalline) invisible;';
            jessie += this.name+'_vline=||('+this.point2+',verticalline) invisible;';
            jessie += this.name+'_diff='+this.name+'_hline&'+this.name+'_vline invisible;'
        }
        if (this.showxdiff){
            jessie += this.name+'_{dx}=['+this.point1+' '+this.name+'_diff] nolabel;';
            jessie += this.name+'_{dxmid}=1/2('+this.point1+','+this.name+'_diff);';
        }
        if (this.showydiff){
            jessie += this.name+'_{dy}=['+this.point2+' '+this.name+'_diff] nolabel;';
        }
        return jessie;
    }

    Emfgsegment.prototype.getDrawOptions = function(){
        // Get options that are used for drawing. List of elements to draw.
        var element = this;
        var board = this.parent.board;
        var resultlist = [
            {
                drawtype: 'line',
                parents: [this.point1, this.point2],
                options: {
                    straightFirst: false,
                    straightLast: false,
                    strokeColor: this.color,
                    name: this.name,
                    fixed: this.isReadonly(),
                    strokeWidth: 1.5
                }
            },
            {
                drawtype: 'parallel',
                parents: ['horizontalline', this.point1],
                options: {
                    name: this.name+'_hline',
                    visible: false
                }
            },
            {
                drawtype: 'parallel',
                parents: ['verticalline', this.point2],
                options: {
                    name: this.name+'_vline',
                    visible: false
                }
            },
            {
                drawtype: 'intersection',
                parents: [this.name+'_hline', this.name+'_vline', 0],
                options: {
                    name: this.name+'_diff',
                    visible: false
                }
            }
        ];
        var p1 = board.elementsByName[this.point1];
        var p2 = board.elementsByName[this.point2];
        if (this.showxdiff){
            resultlist.push({
                drawtype: 'line',
                parents: [this.point1, this.name+'_diff'],
                options: {
                    name: this.name+'_{dx}',
                    straightFirst: false,
                    straightLast: false,
                    strokeColor: 'blue',
                    dash: 1,
                    strokeWidth: 1
                }
            });
            resultlist.push({
                drawtype: 'text',
                parents: [
                    function(){return (p1.X() + p2.X())/2;},
                    function(){return (p1.Y() - 0.5);},
                    (this.showdxdyvalue ? function(){
                        var result = '\u0394<em>x</em>='+(Math.round(Math.abs(p1.X()-p2.X())*100)/100);
                        return (element.parent.decimalperiod ? result.replace(/\./g, ',') : result);
                    } : '\u0394<em>x</em>')
                ],
                options: {color: 'blue'}
            });
        }
        if (this.showydiff){
            resultlist.push({
                drawtype: 'line',
                parents: [this.point2, this.name+'_diff'],
                options: {
                    name: this.name+'_{dy}',
                    straightFirst: false,
                    straightLast: false,
                    strokeColor: 'blue',
                    dash: 1,
                    strokeWidth: 1
                }
            });
            resultlist.push({
                drawtype: 'text',
                parents: [
                    function(){return (p2.X() + 0.5);},
                    function(){return (p1.Y() + p2.Y())/2;},
                    (this.showdxdyvalue ? function(){
                        var result = '\u0394<em>y</em>='+(Math.round(Math.abs(p1.Y()-p2.Y())*100)/100);
                        return (element.parent.decimalperiod ? result.replace(/\./g, ',') : result);
                    } : '\u0394<em>y</em>')
                ],
                options: {color: 'blue'}
            });
        }
        if (this.showlength) {
            resultlist.push({
                drawtype: 'text',
                parents: [
                    function() {return (p1.X()+p2.X())/2 -0.5;},
                    function() {return (p1.Y()+p2.Y())/2 +0.5;},
                    function() {
                        var result = ''+Math.round(Math.sqrt(Math.pow(p1.X()-p2.X(), 2)+Math.pow(p1.Y()-p2.Y(), 2))*100)/100;
                        return (element.parent.decimalperiod ? result.replace(/\./g, ',') : result);
                    }
                ],
                options: {color: 'blue', backgroundColor: 'white'}
            });
        }
        return resultlist;
    }

    Emfgsegment.prototype.getEditItem = function(){
        // Return the html-string for this element's item in the list in edit mode.
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<a href="javascript:;" class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'"><span></span></a>',
            '</div>',
            '<div class="emfg_element_content">',
            '<span class="mathquill-embedded-latex">' + this.getLabel() + '= \\: \\overline{\\editable{' + this.point1 + '} \\editable{'+ this.point2 + '}}</span>',
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '<a href="javascript:;" class="emfg_elemtools_removeelem emfg_gradbg"><span></span></a>',
            '</div>',
            '<div class="emfgitem_options emfg_segment_options">',
            '<input type="checkbox"'+(this.showxdiff || this.showydiff ? ' checked="checked"':'')+' id="emfg_segment_'+this.simplename+'_dxdy" /><label for="emfg_segment_'+this.simplename+'_dxdy">&#x394;x / &#x394;y</label></br>',
            '<input type="checkbox"'+(this.showdxdyvalue ? ' checked="checked"':'')+' id="emfg_segment_'+this.simplename+'_dxdyvalue" /><label for="emfg_segment_'+this.simplename+'_dxdyvalue">&#x394;x=a / &#x394;y=b</label><br />',
            '<input type="checkbox"'+(this.showlength ? ' checked="checked"':'')+' id="emfg_segment_'+this.simplename+'_length" /><label for="emfg_segment_'+this.simplename+'_length">|s|</label>',
            '</div>',
            '<a href="javascript:;" class="emfg_options_showhide">...</a>',
        ].join('\n');
        return elemsettings;
    }

    Emfgsegment.prototype.getInputData = function(){
        // Get input data from mathquill elements.
        var $mqelems = this.listitem.find('.mathquill-editable');
        var data = {
            point1: $mqelems.eq(0).mathquill('latex'),
            point2: $mqelems.eq(1).mathquill('latex')
        }
        return data;
    }

    Emfgsegment.prototype.initExtraOptions = function(){
        // Init events for the extra options of this element.
        var element = this;
        this.listitem.find('#emfg_segment_'+this.simplename+'_dxdy').change(function(){
            element.showxdiff = $(this).is(':checked');
            element.showydiff = element.showxdiff;
            element.changed();
            element.redrawAll();
        });
        this.listitem.find('#emfg_segment_'+this.simplename+'_dxdyvalue').change(function(){
            element.showdxdyvalue = $(this).is(':checked');
            element.changed();
            element.redrawAll();
        });
        this.listitem.find('#emfg_segment_'+this.simplename+'_length').change(function(){
            element.showlength = $(this).is(':checked');
            element.changed();
            element.redrawAll();
        });
    }

    Emfgsegment.prototype.getShowItem = function(){
        // Return the html-string for this element's item in the list in show mode.
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<span class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'">',
            '<span></span></span>',
            '</div>',
            '<div class="emfg_element_content">',
            '<span class="mathquill-embedded-latex">' + this.getLabel() + ': \\: \\overline{' + this.point1 + '\\,'+ this.point2 +'}</span>',
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '</div>',
        ].join('\n');
        return elemsettings;
    }


    /************************************************
     * Emfgcircle -class
     * Circle elements as equations in centerpoint mode or normal mode.
     ************************************************/

    var Emfgcircle = function(options){
        // Representation of a circle
        this.type = 'circle';
        this.parent = options.parent;
        this.name = options.name;
        this.simplename = this.name.replace(/[{}]/g, '');
        this.inputtype = options.inputtype || 'centerpoint';
        if (this.inputtype === 'centerpoint'){
            this.x0Latex = ''+options.x0 || '0';
            this.y0Latex = ''+options.y0 || '0';
            this.rLatex = ''+options.r || '1';
            this.convertToNormal();
        } else if (this.inputtype === 'normal'){
            this.aLatex = ''+options.a || '0';
            this.bLatex = ''+options.b || '0';
            this.cLatex = ''+options.c || '0';
        }
        this.color = options.color || 'red';
        this.readonly = !!options.readonly;
        this.valid = true;
        this.invalids = [];
        this.setCircle({x0: this.x0Latex, y0: this.y0Latex, r: this.rLatex});
        this.isDirty = false;
    }
    
    // Inherit prototypes from Emfgelement, override constructor with own one.
    Emfgcircle.prototype = new Emfgelement();
    Emfgcircle.prototype.constructor = Emfgcircle;

    Emfgcircle.prototype.getData = function(){
        // Get all data of the circle.
        // Use the default fields defined in parent class and add some own fields.
        var result = this.parentClass.getData.call(this);
        result.x0 = this.x0Latex;
        result.y0 = this.y0Latex;
        result.r = this.rLatex;
        result.a = this.aLatex;
        result.b = this.bLatex;
        result.c = this.cLatex;
        result.inputtype = this.inputtype;
        return result;
    }

    Emfgcircle.prototype.setCircle = function(options){
        // Set values for circle. Normalize decimal separator to '.'.
        options = jQuery.extend(true,{
            x0: this.x0Latex,
            y0: this.y0Latex,
            r: this.rLatex,
            a: this.aLatex,
            b: this.bLatex,
            c: this.cLatex,
            inputtype: this.inputtype
        }, options);
        this.valid = true;
        if (options.inputtype === 'centerpoint'){
                        
                options.x0 = (''+options.x0).replace(/,/g, '.');
                options.y0 = (''+options.y0).replace(/,/g, '.');
                options.r = (''+options.r).replace(/,/g, '.');
                
                this.isDirty = (this.x0Latex !== options.x0 ||  this.y0Latex !== options.y0 ||  this.rLatex !== options.r);
                
            this.x0Latex = options.x0;
            this.y0Latex = options.y0;
            this.rLatex = options.r;

            
            try {
                this.x0 = Emathfuncgraph.latexeval(this.x0Latex);
            } catch (err) {
                this.valid = false;
                this.invalids.push(0);
            }
            try {
                this.y0 = Emathfuncgraph.latexeval(this.y0Latex);
            } catch (err) {
                this.valid = false;
                this.invalids.push(1);
            }
            try {
                this.r = Emathfuncgraph.latexeval(this.rLatex);
            } catch (err) {
                this.valid = false;
                this.invalids.push(2);
            }
            if (this.valid){
                this.convertToNormal();
            }
        } else if (options.inputtype === 'normal'){
                
                options.a = (''+options.a).replace(/,/g, '.');
                options.b = (''+options.b).replace(/,/g, '.');
                options.c = (''+options.c).replace(/,/g, '.');
                
                this.isDirty = (this.aLatex !== options.a ||  this.bLatex !== options.b ||  this.cLatex !== options.c);
                
            this.aLatex = options.a;
            this.bLatex = options.b;
            this.cLatex = options.c;
            try {
                this.a = Emathfuncgraph.latexeval(this.aLatex);
            } catch (err) {
                this.valid = false;
                this.invalids.push(0);
            }
            try {
                this.b = Emathfuncgraph.latexeval(this.bLatex);
            } catch (err) {
                this.valid = false;
                this.invalids.push(1);
            }
            try {
                this.c = Emathfuncgraph.latexeval(this.cLatex);
            } catch (err) {
                this.valid = false;
                this.invalids.push(2);
            }
            if (this.valid){
                this.convertToCenterpoint();
            }
        }
        return this.valid;
    }

    // Common alias for set-method.
    Emfgcircle.prototype.setElement = Emfgcircle.prototype.setCircle;

    Emfgcircle.prototype.getX0string = function(){
        // Get x0 coordinate as a Jessiescriptable string.
        return (''+(Math.round(this.x0 *10000000)/10000000));
    }

    Emfgcircle.prototype.getY0string = function(){
        // Get y0 coordinate as a Jessiescriptable string.
        return (''+(Math.round(this.y0 *10000000)/10000000));
    }

    Emfgcircle.prototype.getRstring = function(){
        // Get value of r as a Jessiescriptable string.
        return (''+(Math.round(this.r *10000000)/10000000));
    }

    Emfgcircle.prototype.getX0latex = function(){
        // Get x0 coordinate as LaTeX. Localize the decimal separator, if needed.
        result = this.x0Latex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgcircle.prototype.getY0latex = function(){
        // Get y0 coordinate as LaTeX. Localize the decimal separator, if needed.
        result = this.y0Latex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgcircle.prototype.getRlatex = function(){
        // Get value of r as LaTeX. Localize the decimal separator, if needed.
        result = this.rLatex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgcircle.prototype.getAlatex = function(){
        // Get value of a as LaTeX. Localize the decimal separator, if needed.
        result = this.aLatex;
        if (this.parent.decimalperiod){
            result = result.replace('.', ',');
        }
        return result;
    }

    Emfgcircle.prototype.getBlatex = function(){
        // Get value of b as LaTeX. Localize the decimal separator, if needed.
        result = this.bLatex;
        if (this.parent.decimalperiod){
            result = result.replace('.', ',');
        }
        return result;
    }

    Emfgcircle.prototype.getClatex = function(){
        // Get value of c as LaTeX. Localize the decimal separator, if needed.
        result = this.cLatex;
        if (this.parent.decimalperiod){
            result = result.replace('.', ',');
        }
        return result;
    }

    Emfgcircle.prototype.setColor = function(color){
        // Set the color of the circle.
        var board = this.parent.board;
        if (typeof(color) !== 'undefined'){
            this.color = color;
        } else {
            this.color = this.color || 'red';
        }
        board.elementsByName[this.name].setProperty({strokeColor: this.color});
        board.elementsByName[this.name+'_{cp}'].setProperty({strokeColor: this.color});
    }

    Emfgcircle.prototype.getJessie = function(){
        // Get the JessieScript string for this circle.
        var jessie = [
            'Cp'+this.name + '('+this.getX0string() +','+this.getY0string()+') invisible;',
            this.name + '=k(Cp'+this.name+', '+this.getRstring()+');'
        ].join(' ');
        return jessie;
    }

    Emfgcircle.prototype.getDrawOptions = function(){
        // Get options that are used for drawing.
        var resultlist = [
            {
                drawtype: 'point',
                parents: [this.x0, this.y0],
                options: {
                    name: this.name + '_{cp}',
                    face: (this.isReadonly() ? '[]' : 'x'),
                    withLabel: false,
                    size: 3,
                    strokeWidth: 1,
                    strokeColor: this.color,
                    fillColor: (this.isReadonly() ? 'white' : this.color),
                    fixed: this.readonly
                }
            },
            {
                drawtype: 'circle',
                parents: [this.name+'_{cp}', this.r],
                options: {
                    name: this.name,
                    strokeColor: this.color,
                    strokeWidth: 1.5,
                    withLabel: true
                }
            }
        ];
        return resultlist;
    }

    Emfgcircle.prototype.getEditItem = function(){
        // Return the html-string for this element's item in the list in edit mode.
        var formulastrings = {
            'centerpoint': '<span class="mathquill-embedded-latex" style="font-size: 85%; white-space: nowrap;">' + this.getLabel() + ':</span> <span class="mathquill-embedded-latex" style="font-size: 90%;"> \\left(x-\\left(\\editable{' + this.getX0latex() + '}\\right)\\right)^{2}+\\left(y-\\left(\\editable{'+ this.getY0latex() + '}\\right)\\right)^{2}=\\left(\\editable{'+this.getRlatex()+'}\\right)^{2}</span>',
            'normal': '<span class="mathquill-embedded-latex" style="font-size: 85%; white-space: nowrap;">' + this.getLabel() + ':</span> <span class="mathquill-embedded-latex" style="font-size: 90%;"> x^2+y^2+\\left(\\editable{' + this.getAlatex() + '}\\right)x+\\left(\\editable{'+ this.getBlatex() + '}\\right)y+\\left(\\editable{'+this.getClatex()+'}\\right)=0</span>'
        };
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<a href="javascript:;" class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'"><span></span></a>',
            '</div>',
            '<div class="emfg_element_content">',
            formulastrings[this.inputtype],
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '<a href="javascript:;" class="emfg_elemtools_removeelem emfg_gradbg"><span></span></a>',
            '</div>',
            '<div class="emfgitem_options emfg_circle_options">',
            '<input type="radio"'+(this.inputtype === 'centerpoint' ? ' checked="checked"':'')+' id="emfg_circle_'+this.name+'_inputtypecp" name="emfg_circle_'+this.name+'_inputtype" value="centerpoint" /><label for="emfg_circle_'+this.name+'_inputtypecp"><i>(x-x<sub>0</sub>)<sup>2</sup>+(y-y<sub>0</sub>)<sup>2</sup>=r<sup>2</sup></i></label><br />',
            '<input type="radio"'+(this.inputtype === 'normal' ? ' checked="checked"':'')+' id="emfg_circle_'+this.name+'_inputtypenormal" name="emfg_circle_'+this.name+'_inputtype" value="normal" /><label for="emfg_circle_'+this.name+'_inputtypenormal"><i>x<sup>2</sup>+y<sup>2</sup>+ax+by+c=0</i></label>',
            '</div>',
            '<a href="javascript:;" class="emfg_options_showhide">...</a>',
        ].join('\n');
        return elemsettings;
    }

    Emfgcircle.prototype.initExtraOptions = function(){
        // Init events for the extra options of this element.
        var element = this;
        this.listitem.find('input[name="emfg_circle_'+this.name+'_inputtype"]').change(function(){
            element.inputtype = $(this).val();
            element.changed();
            element.drawEditItem();
            element.listitem.find('.emfgitem_options').show().next().addClass('open');
        });
    }

    Emfgcircle.prototype.getInputData = function(){
        // Get input data from mathquill elements.
        var element = this;
        var $mqelems = this.listitem.find('.mathquill-editable');
        var data = {inputtype: this.inputtype};
        if (element.inputtype === 'centerpoint'){
            data.x0 = $mqelems.eq(0).mathquill('latex');
            data.y0 = $mqelems.eq(1).mathquill('latex');
            data.r = $mqelems.eq(2).mathquill('latex');
        } else {
            data.a = $mqelems.eq(0).mathquill('latex');
            data.b = $mqelems.eq(1).mathquill('latex');
            data.c = $mqelems.eq(2).mathquill('latex');
        }
        return data;
    }

    Emfgcircle.prototype.getShowItem = function(){
        // Return the html-string for this element's item in the list in show mode.
        var formulastrings = {
            'centerpoint': '<span class="mathquill-embedded-latex" style="font-size: 85%; white-space: nowrap;">' + this.getLabel() + ':</span> <span class="mathquill-embedded-latex" style="font-size: 90%;"> \\left(x-\\left(' + this.getX0latex() + '\\right)\\right)^{2}+\\left(y-\\left('+ this.getY0latex() + '\\right)\\right)^{2}=\\left('+this.getRlatex()+'\\right)^{2}</span>',
            'normal': '<span class="mathquill-embedded-latex" style="font-size: 85%; white-space: nowrap;">' + this.getLabel() + ':</span> <span class="mathquill-embedded-latex" style="font-size: 90%;"> x^2+y^2+\\left(' + this.getAlatex() + '\\right)x+\\left('+ this.getBlatex() + '\\right)y+\\left('+this.getClatex()+'\\right)=0</span>'
        };
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<span class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'">',
            '<span></span></span>',
            '</div>',
            '<div class="emfg_element_content">',
            formulastrings[this.inputtype],
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '</div>',
        ].join('\n');
        return elemsettings;
    }

    Emfgcircle.prototype.convertToNormal = function(){
        // Compute coefficients for normal form, when centerpoint format is known;
        this.a = Math.round(-2*this.x0 * 10)/10;
        this.b = Math.round(-2*this.y0 * 10)/10;
        this.c = Math.round((this.x0 * this.x0 + this.y0 * this.y0 - (this.r * this.r)) * 10 )/10;
        this.aLatex = ''+this.a;
        this.bLatex = ''+this.b;
        this.cLatex = ''+this.c;
    }

    Emfgcircle.prototype.convertToCenterpoint = function(){
        // Compute coefficients for centerpoint format, when normal form is known;
        this.x0 = this.a / (-2);
        this.y0 = this.b / (-2);
        this.r = Math.round(Math.sqrt(this.x0 * this.x0 + this.y0 * this.y0 - this.c)*10)/10;
        this.x0Latex = ''+this.x0;
        this.y0Latex = ''+this.y0;
        this.rLatex = ''+this.r;
    }

    Emfgcircle.prototype.dragUpdate = function(){
        // Update dragged circle.
        var board = this.parent.board;
        var changed = false;
        var jsxcoords = board.elementsByName[this.name + '_{cp}'].coords.usrCoords;
        var coords = {x0: jsxcoords[1], y0: jsxcoords[2]};
        if (coords.x0 !== this.x0 || coords.y0 !== this.y0){
            coords.x0 = Math.round(coords.x0 * 10)/10;
            coords.y0 = Math.round(coords.y0 * 10)/10;
            coords.inputtype = 'centerpoint';
            this.setCircle(coords);
            changed = true;
        }
        return changed;
    }


    /************************************************
     * Emfgline -class
     * Line elements as equations.
     ************************************************/

    var Emfgline = function(options){
        // Representation of a line.
        this.type = 'line';
        this.parent = options.parent;
        this.name = options.name;
        this.simplename = this.name.replace(/[{}]/g, '');
        this.inputtype = options.inputtype || 'explicit';
        this.color = options.color || 'blue';
        this.readonly = !! options.readonly;
        this.valid = true;
        this.invalids = [];
        this.isDirty = false;
        switch (this.inputtype){
            case 'explicit':
                this.kLatex = ''+options.k || '1';
                this.ebLatex = ''+options.eb || '0';
                this.setLine();
                this.convertFromExplicit();
                break;
            case 'normal':
                this.aLatex = ''+options.a || '1';
                this.bLatex = ''+options.b || '1';
                this.cLatex = ''+options.c || '0';
                this.setLine();
                this.convertFromNormal();
                break;
            case 'point':
                this.kLatex = ''+options.k || '1';
                this.x0Latex = ''+options.x0 || '0';
                this.y0Latex = ''+options.y0 || '0';
                this.setLine();
                this.convertFromPoint();
                break;
            case 'vertical':
                this.vaLatex = ''+options.va || '0';
                this.setLine();
                this.convertFromVertical();
                break;
            default:
                this.setLine();
                break;
        }
    }

    // Inherit prototypes from Emfgelement, override constructor with own one.
    Emfgline.prototype = new Emfgelement();
    Emfgline.prototype.constructor = Emfgline;

    Emfgline.prototype.getData = function(){
        // Get all data of the line.
        // Use the default fields defined in parent class and add some own fields.
        var result = this.parentClass.getData.call(this);
        result.k = this.kLatex;
        result.eb = this.ebLatex;
        result.a = this.aLatex;
        result.b = this.bLatex;
        result.c = this.cLatex;
        result.x0 = this.x0Latex;
        result.y0 = this.y0Latex;
        result.va = this.vaLatex;
        result.inputtype = this.inputtype;
        return result;
    }

    Emfgline.prototype.setLine = function(options){
        // Set values for line. Normalize decimal separator to '.'.
        options = jQuery.extend(true,{
            k: this.kLatex,
            eb: this.ebLatex,
            a: this.aLatex,
            b: this.bLatex,
            c: this.cLatex,
            x0: this.x0Latex,
            y0: this.y0Latex,
            va: this.vaLatex,
            inputtype: this.inputtype
        }, options);
        this.valid = true;
        this.invalids = [];
        switch (options.inputtype){
            case 'normal':
                
                
                options.a = (''+options.a).replace(/,/g, '.');
                options.b = (''+options.b).replace(/,/g, '.');
                options.c = (''+options.c).replace(/,/g, '.');
                
                this.isDirty = (this.aLatex !== options.a ||  this.bLatex !== options.b ||  this.cLatex !== options.c);
                
                this.aLatex = options.a;
                this.bLatex = options.b;
                this.cLatex = options.c;

       
                try {
                    this.a = Emathfuncgraph.latexeval(this.aLatex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(0);
                }
                try {
                    this.b = Emathfuncgraph.latexeval(this.bLatex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(1);
                }
                try {
                    this.c = Emathfuncgraph.latexeval(this.cLatex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(2);
                }
                if (this.valid){
                    this.convertFromNormal();
                }
                break;
            case 'explicit':
 
                options.k = (''+options.k).replace(/,/g, '.');
                options.eb = (''+options.eb).replace(/,/g, '.');
                
                this.isDirty = (this.kLatex !== options.k ||  this.ebLatex !== options.eb);
                
                this.kLatex = options.k;
                this.ebLatex = options.eb;
                
           
                try {
                    this.k = Emathfuncgraph.latexeval(this.kLatex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(0);
                }
                try {
                    this.eb = Emathfuncgraph.latexeval(this.ebLatex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(1);
                }
                if (this.valid){
                    this.convertFromExplicit();
                }
                break;
            case 'point':
                
                options.y0 = (''+options.y0).replace(/,/g, '.');
                options.k = (''+options.k).replace(/,/g, '.');
                options.x0 = (''+options.x0).replace(/,/g, '.');
                
                this.isDirty = (this.y0Latex !== options.y0 ||  this.kLatex !== options.k ||  this.x0Latex !== options.x0);
                
                this.y0Latex = options.y0;
                this.kLatex = options.k;
                this.x0Latex = options.x0;

             
                try {
                    this.y0 = Emathfuncgraph.latexeval(this.y0Latex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(0);
                }
                try {
                    this.k = Emathfuncgraph.latexeval(this.kLatex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(1);
                }
                try {
                    this.x0 = Emathfuncgraph.latexeval(this.x0Latex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(2);
                }
                if (this.valid){
                    this.convertFromPoint();
                }
                break;
            case 'vertical':
                
                
                options.va = (''+options.va).replace(/,/g, '.');
                
                this.isDirty = (this.vaLatex !== options.va);

                this.vaLatex = options.va;

                
                try {
                    this.va = Emathfuncgraph.latexeval(this.vaLatex);
                } catch (err){
                    this.valid = false;
                    this.invalids.push(0);
                }
                if (this.valid){
                    this.convertFromVertical();
                }
                break;
            default:
                break;
        }
    }

    // Common alias for set-method.
    Emfgline.prototype.setElement = Emfgline.prototype.setLine;

    Emfgline.prototype.getAString = function(){
        // Get a as a string.
        return (''+(Math.round(this.a * 10000000)/10000000));
    }

    Emfgline.prototype.getALatex = function(){
        // Get a as LaTeX. Localize the decimal separator, if needed.
        result = this.aLatex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgline.prototype.getBString = function(){
        // Get b as a string.
        return (''+(Math.round(this.b * 10000000)/10000000));
    }

    Emfgline.prototype.getBLatex = function(){
        // Get b as LaTeX. Localize the decimal separator, if needed.
        result = this.bLatex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgline.prototype.getCString = function(){
        // Get c as a string.
        return (''+(Math.round(this.c * 10000000)/10000000));
    }

    Emfgline.prototype.getCLatex = function(){
        // Get c as LaTeX. Localize the decimal separator, if needed.
        result = this.cLatex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgline.prototype.getKString = function(){
        // Get k as a string.
        return (''+(Math.round(this.k * 10000000)/10000000));
    }

    Emfgline.prototype.getKLatex = function(){
        // Get k as LaTeX. Localize the decimal separator, if needed.
        result = this.kLatex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgline.prototype.getEbString = function(){
        // Get eb as a string.
        return (''+(Math.round(this.eb * 10000000)/10000000));
    }

    Emfgline.prototype.getEbLatex = function(){
        // Get eb as LaTeX. Localize the decimal separator, if needed.
        result = this.ebLatex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgline.prototype.getX0String = function(){
        // Get x0 as a string.
        return (''+(Math.round(this.x0 * 10000000)/10000000));
    }

    Emfgline.prototype.getX0Latex = function(){
        // Get x0 as LaTeX. Localize the decimal separator, if needed.
        result = this.x0Latex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgline.prototype.getY0String = function(){
        // Get y0 as a string.
        return (''+(Math.round(this.y0 * 10000000)/10000000));
    }

    Emfgline.prototype.getY0Latex = function(){
        // Get y0 as LaTeX. Localize the decimal separator, if needed.
        result = this.y0Latex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgline.prototype.getVaString = function(){
        // Get va as a string.
        return (''+(Math.round(this.va * 10000000)/10000000));
    }

    Emfgline.prototype.getVaLatex = function(){
        // Get va as LaTeX. Localize the decimal separator, if needed.
        result = this.vaLatex;
        if (this.parent.decimalperiod){
            result = result.replace(/\./g, ',');
        }
        return result;
    }

    Emfgline.prototype.setColor = function(color){
        // Set the color of the line.
        var board = this.parent.board;
        if (typeof(color) !== 'undefined'){
            this.color = color;
        } else {
            this.color = this.color || 'blue';
        }
        board.elementsByName[this.name].setProperty({strokeColor: this.color});
    }

    Emfgline.prototype.getDrawOptions = function(){
        // Get options that are used for drawing.
        var element = this;
        var result = {};
        result.drawtype = 'line';
        result.parents = [this.c, this.a, this.b];
        result.options = {
            name: this.name,
            strokeWidth: 1.5,
            strokeColor: this.color,
            fixed: true
        }
        return [result];
    }

    Emfgline.prototype.getEditItem = function(){
        // Return the html-string for this element's item in the list in edit mode.
        var formulastrings = {
            'normal': '<span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">'+this.getLabel() + ': </span> <span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">\\editable{' +this.getALatex()+ '}x+\\left(\\editable{' + this.getBLatex() + '}\\right)y+\\left(\\editable{' + this.getCLatex() + '}\\right)=0</span>',
            'explicit': '<span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">'+this.getLabel() + ': </span> <span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">y=\\editable{' +this.getKLatex()+ '}x+\\left(\\editable{' + this.getEbLatex() + '}\\right)</span>',
            'point': '<span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">'+this.getLabel() + ': </span> <span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">y-\\left(\\editable{' +this.getY0Latex()+ '}\\right)=\\editable{'+this.getKLatex()+'}\\cdot \\left(x-\\left(\\editable{' + this.getX0Latex() + '}\\right)\\right)</span>',
            'vertical': '<span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">'+this.getLabel() + ': </span> <span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">x=\\editable{' +this.getVaLatex()+ '}</span>'
        };
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<a href="javascript:;" class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'"><span></span></a>',
            '</div>',
            '<div class="emfg_element_content">',
            formulastrings[this.inputtype],
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '<a href="javascript:;" class="emfg_elemtools_removeelem emfg_gradbg"><span></span></a>',
            '</div>',
            '<div class="emfgitem_options emfg_circle_options">',
            '<input type="radio"'+(this.inputtype === 'normal' ? ' checked="checked"':'')+' id="emfg_line_'+this.name+'_inputtypenormal" name="emfg_line_'+this.name+'_inputtype" value="normal" /><label for="emfg_line_'+this.name+'_inputtypenormal"><i>ax+by+c=0</i></label><br />',
            '<input type="radio"'+(this.inputtype === 'explicit' ? ' checked="checked"':'')+' id="emfg_line_'+this.name+'_inputtypeexplicit" name="emfg_line_'+this.name+'_inputtype" value="explicit" /><label for="emfg_line_'+this.name+'_inputtypeexplicit"><i>y=kx+b</i></label><br />',
            '<input type="radio"'+(this.inputtype === 'point' ? ' checked="checked"':'')+' id="emfg_line_'+this.name+'_inputtypepoint" name="emfg_line_'+this.name+'_inputtype" value="point" /><label for="emfg_line_'+this.name+'_inputtypepoint"><i>y-y<sub>0</sub>=k(x-x<sub>0</sub>)</i></label><br />',
            '<input type="radio"'+(this.inputtype === 'vertical' ? ' checked="checked"':'')+' id="emfg_line_'+this.name+'_inputtypevertical" name="emfg_line_'+this.name+'_inputtype" value="vertical" /><label for="emfg_line_'+this.name+'_inputtypevertical"><i>x=a</i></label>',
            '</div>',
            '<a href="javascript:;" class="emfg_options_showhide">...</a>',
        ].join('\n');
        return elemsettings;
    }

    Emfgline.prototype.getInputData = function(){
        // Get input data from mathquill elements.
        var $mqelems = this.listitem.find('.mathquill-editable');
        var data = {inputtype: this.inputtype};
        switch (this.inputtype){
            case 'normal':
                data.a = $mqelems.eq(0).mathquill('latex');
                data.b = $mqelems.eq(1).mathquill('latex');
                data.c = $mqelems.eq(2).mathquill('latex');
                break;
            case 'explicit':
                data.k = $mqelems.eq(0).mathquill('latex');
                data.eb = $mqelems.eq(1).mathquill('latex');
                break;
            case 'point':
                data.y0 = $mqelems.eq(0).mathquill('latex');
                data.k = $mqelems.eq(1).mathquill('latex');
                data.x0 = $mqelems.eq(2).mathquill('latex');
                break;
            case 'vertical':
                data.va = $mqelems.eq(0).mathquill('latex');
                break;
            default:
                break;
        }
        return data;
    }

    Emfgline.prototype.initExtraOptions = function(){
        // Init events for the extra options of this element.
        var element = this;
        this.listitem.find('input[name="emfg_line_'+this.name+'_inputtype"]').change(function(){
            element.inputtype = $(this).val();
            element.isDirty = true;
            switch (element.inputtype){
                case 'explicit':
                    element.convertFromExplicit();
                    break;
                case 'point':
                    element.convertFromPoint();
                    break;
                case 'vertical':
                    element.convertFromVertical();
                    break;
                default:
                    element.convertFromNormal();
                    break;
            }

            element.changed();
            element.drawEditItem();
            //element.updateFromInput();
            //element.markErrors();
            element.redrawAll();
            element.listitem.find('.emfgitem_options').show().next().addClass('open');
        });

    }

    Emfgline.prototype.getShowItem = function(){
        // Return the html-string for this element's item in list in show mode.
        var formulastrings = {
            'normal': '<span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">'+this.getLabel() + ': </span> <span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">' +this.getALatex()+ 'x+\\left(' + this.getBLatex() + '\\right)y+\\left(' + this.getCLatex() + '\\right)=0</span>',
            'explicit': '<span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">'+this.getLabel() + ': </span> <span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">y=' +this.getKLatex()+ ' x+\\left(' + this.getEbLatex() + '\\right)</span>',
            'point': '<span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">'+this.getLabel() + ': </span> <span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">y-\\left(' +this.getY0Latex()+ '\\right)='+this.getKLatex()+'\\cdot \\left(x-\\left(' + this.getX0Latex() + '\\right)\\right)</span>',
            'vertical': '<span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">'+this.getLabel() + ': </span> <span class="mathquill-embedded-latex" style="font-size: 90%; white-space: nowrap;">x=' +this.getVaLatex()+ '</span>'
        };
        var elemsettings = [
            '<div class="emfg_elemtools">',
            '<span class="emfg_elemtools_color emfg_gradbg" color="'+this.getColor()+'">',
            '<span></span></span>',
            '</div>',
            '<div class="emfg_element_content">',
            formulastrings[this.inputtype],
            '</div>',
            '<div class="emfg_elemtools_right">',
            this.lockHtml(this.parent.authormode),
            '</div>',
        ].join('\n');
        return elemsettings;
    }

    Emfgline.prototype.markErrors = function(){
        var $mqelems = this.listitem.find('.mathquill-editable');
        if (!this.valid){
            for (var i = 0; i < this.invalids.length; i++){
                $mqelems.eq(this.invalids[i]).addClass('emfg_error');
            }
        } else {
            $mqelems.removeClass('emfg_error');
        }
    }

    Emfgline.prototype.convertFromNormal = function(){
        // Compute coefficients for other types from normal.
        this.convertFromNormalToExplicit();
        this.convertFromNormalToVertical();
        this.convertFromNormalToPoint();
    }

    Emfgline.prototype.convertFromNormalToExplicit = function(frompoint){
        // Compute coefficients for explicit format from normal.
        if (this.b !== 0){
            if (!frompoint){
                this.k = Math.round(-10*this.a/this.b)/10;
            }
            this.eb = Math.round(-10*this.c/this.b)/10;
        } else {
            if (!frompoint){
                this.k = 1;
            }
            this.eb = 0;
        }
        if (!frompoint){
            this.kLatex = ''+this.k;
        }
        this.ebLatex = ''+this.eb;
    }

    Emfgline.prototype.convertFromNormalToVertical = function(){
        // Compute coefficients for vertical line from normal form.
        if (this.a !== 0){
            this.va = Math.round(-10*this.c/this.a)/10;
        } else {
            this.va = 0;
        }
        this.vaLatex = ''+this.va;
    }

    Emfgline.prototype.convertFromNormalToPoint = function(fromexplicit){
        // Compute coefficients for point-on-line format from normal form.
        if (this.a !== 0 && this.b !== 0){
            this.y0 = 0;
            this.x0 = Math.round(-10*this.c/this.a)/10;
            if (!fromexplicit){
                this.k = Math.round(-10*this.a/this.b)/10;
            }
        } else {
            this.y0 = 0;
            this.x0 = 0;
            if (!fromexplicit){
                this.k = 1;
            }
        }
        if (!fromexplicit){
            this.kLatex = ''+this.k;
        }
        this.x0Latex = ''+this.x0;
        this.y0Latex = ''+this.y0;
    }

    Emfgline.prototype.convertFromExplicit = function(){
        // Compute coefficients for other types from explicit.
        this.a = Math.round(10*this.k)/10;
        this.b = -1;
        this.c = Math.round(10*this.eb)/10;
        this.aLatex = ''+this.a;
        this.bLatex = ''+this.b;
        this.cLatex = ''+this.c;
        this.convertFromNormalToVertical();
        this.convertFromNormalToPoint(true);
    }

    Emfgline.prototype.convertFromPoint = function(){
        // Compute coefficients for other types from point.
        this.a = this.k;
        this.b = -1;
        this.c = Math.round(10*(this.y0 - this.k * this.x0))/10;
        this.aLatex = ''+this.kLatex;
        this.bLatex = ''+this.b;
        this.cLatex = ''+this.c;
        this.convertFromNormalToExplicit(true);
        this.convertFromNormalToVertical();
    }

    Emfgline.prototype.convertFromVertical = function(){
        // Compute coefficients for other types from vertical.
        this.a = 1;
        this.b = 0;
        this.c = -this.va;
        this.aLatex = ''+this.a;
        this.bLatex = ''+this.b;
        this.cLatex = ''+this.c;
        this.convertFromNormalToExplicit();
        this.convertFromNormalToPoint();
    }

})(jQuery)

if (typeof(config) !== 'undefined' && typeof(config.macros) !== 'undefined'){
    // Create macro for TiddlyWiki
    config.macros.emathfuncgraph = {
        /******************************
        * Show emathfuncgraph
        ******************************/
        handler: function (place, macroName, params, wikifier, paramString, tiddler)
        {
            if (params.length < 1){
                wikify('Missing funcgraph.', place);
                return false;
            }
            var thispage = jQuery(place).parents('.bookpage');
            if (thispage.length > 0){
                var pageno = Math.max(jQuery('#pageOne, #pageTwo').index(thispage), 0);
            } else {
                var pageno = 0;
            }
            var periodcountries = ['et','fi','sv'];
            periodcountries.indexOf(EbookPages[pageno].ebook.curriculum) != -1;
            var funcgraphid = params[0];
            var isauthor = (params[1] === 'author' || params[1] === 'authordialog');
            var iseditable = (params[1] === 'edit');// || isauthor);
            var isviewmode = (params[1] === 'view');
            var emfgtext = '{{emathfg emathfg_'+funcgraphid+'{\n}}}';
            wikify(emfgtext, place);
            if (tiddler) {
                var settings = jQuery.extend(true, {},DataTiddler.getData(tiddler, 'emathfuncgraph',{}));
            } else {
                var settings = {};
            }
            settings[funcgraphid] = settings[funcgraphid] || {};
            settings[funcgraphid].editable = iseditable || (!isviewmode && settings[funcgraphid].editable);
            //settings[funcgraphid].editable = iseditable;
            settings[funcgraphid].authormode = isauthor;
            settings[funcgraphid].decimalperiod = (periodcountries.indexOf(EbookPages[pageno].ebook.curriculum) !== -1);
            var fgraph = jQuery(place).find('.emathfg.emathfg_'+funcgraphid).last().emathfuncgraph(settings[funcgraphid])
            if ((iseditable || isauthor) &&  params[1] !== 'authordialog') {
                fgraph.unbind('element_changed').bind('element_changed', function(e){
                    var $emfgplace = jQuery(this);
                    var data = $emfgplace.emathfuncgraph('get');
                    var settings = DataTiddler.getData(tiddler, 'emathfuncgraph',{});
                    settings[funcgraphid] = data;
                    var autosavestatus = config.options.chkAutoSave;
                    config.options.chkAutoSave = false;
                    tiddler.setData('emathfuncgraph', settings);
                    config.options.chkAutoSave = autosavestatus;
                });
            }
            return true;
        }
    }
}

//}}}