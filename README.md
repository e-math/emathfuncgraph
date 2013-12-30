Emathfuncgraph
==============

See the [demo page](http://e-math.github.com/emathfuncgraph).

What?
-----
A tool for drawing graphs of mathematical functions and some more.

How?
----
Emathfuncgraph is a jQuery-plugin and can be embedded on any web page
by including `emathfuncgraph.js`-file and defining some html-element
as a graphtool with: `$('#mydiv').emathfuncgraph()`.

Who?
----
The tool was developed in EU-funded [E-Math -project](http://emath.eu) by
* Petri Salmela
* Petri Sallasmaa

and the copyrights are owned by [Four Ferries oy](http://fourferries.fi).

License?
--------
The tool is licensed under [GNU AGPL](http://www.gnu.org/licenses/agpl-3.0.html).
The tool depends on some publicly available open source components with other licenses:
* [jQuery](http://jquery.com) (MIT-license)
* [MathQuill](http://mathquill.com/) (GNU LGPL)
* [JSXGraph](http://jsxgraph.uni-bayreuth.de/) (GNU LGPL and MIT-license)



Usage
======
Initing a graph
----
Init a new, empty, editable graph.

```javascript
jQuery('#box').emathfuncgraph({editable: true});
```

Init a new graph in editing mode with existing data.

```javascript
var data = {...some data...};
data.editable = true;
jQuery('#box').emathfuncgraph(data);
```

Init a new graph in view mode with existing data.

```javascript
var data = {...some data...};
data.editable = false;
jQuery('#box').emathfuncgraph(data);
```

Init a new graph in view mode with existing data, but without list of objects.

```javascript
data.editable = false;
data.listvisible = false;
jQuery('#box').emathfuncgraph(data);
```

Getting data from graph
-----------------------

Get the data from the graph in html-element with id `#box`. Gives the data including
the values `data.editable` and `data.listvisible`.

```javascript
var data = jQuery('#box').emathfuncgraph('get');
```

Author mode
-----------

The graph can also be in "author mode". This mode gives the user interface
for locking objects in read-only state, locking whole graph in non-editable
mode and hiding the object list. (In author mode the object list is always
visible and all objects editable.)

New graph in author mode.

```javascript
jQuery('#box').emathfuncgraph({authormode: true});
```

Init the graph with existing data in the author mode.

```javascirpt
var data = {...some data...};
data.authormode = true;
jQuery('#box').emathfuncgraph(data);
```
