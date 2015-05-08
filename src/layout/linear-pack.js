/**
 * Created by ycui on 4/29/2015.
 */
//import "layout";

d3.layout.linearPack = function () {
    var linearPack = {},
        event = d3.dispatch("start"),
        nodes = [],
        padding = 0,
        size = [1, 1],
        scale = 1;


    var count = 1;

    linearPack.start = function () {
        var n = nodes.length,
            start = 0,
            bounds = [0, 0],
            a, b, c, i, j, k, l;

        function bound(node) {
            bounds[0] = Math.min(bounds[0], node.x - node.r);
            bounds[1] = Math.max(bounds[1], node.x + node.r);
        }

        // sort
        nodes = nodes.sort(d3_layout_linearPackCompare);
        console.log(JSON.stringify(nodes));

        scale = size[1] / nodes.slice(-1)[0].t;
        var rMedian = d3_layout_linearPackMedian(nodes);
        var rMax = d3_layout_linearPackMax(nodes);
        console.log("scale: " + scale);

        for (i = 0; i < n; i++) {
            //nodes[i].t = nodes[i].t;
            nodes[i].t = nodes[i].t * scale;
            //nodes[i].r = nodes[i].r * (rMax / scale) * padding;
            nodes[i].r = nodes[i].r * padding;
        }

        // Create node links.
        nodes.forEach(d3_layout_packLink);

        return function(i) {

            if (i >= n) {
                return - 2;
            }
            if (nodes[i].r <= 0) {
                return i;
            }
            if (bounds[0] == bounds[1] || d3_layout_linearPackContain(bounds, [nodes[i].t - nodes[i].r, nodes[i].t + nodes[i].r])) {
                if (i - start < 3) { // the first three are trivial
                    nodes[i].group = start;
                    switch(i - start) {
                        case 0: // create first node
                            a = nodes[i];
                            a.x = a.t;
                            a.y = 0;
                            bound(a);

                            nodes[i].i = count;
                            count++;

                            break;
                        case 1: // create second node
                            b = nodes[i];
                            b.x = a.t + a.r + b.r;
                            b.y = 0;
                            bound(b);

                            nodes[i].i = count;
                            count++;

                            break;
                        case 2: // create third node and build front-chain
                            c = nodes[i];
                            d3_layout_pack2Place(a, b, c);
                            bound(c);
                            d3_layout_packInsert(a, c);
                            a._pack_prev = c;
                            d3_layout_packInsert(c, b);
                            b = a._pack_next;

                            nodes[i].i = count;
                            count++;

                            break;
                    }
                } else { // find the best placement for the rest
                    d3_layout_packUnlink(nodes[i]);

                    var locations = [],
                        t = [nodes[i].t - nodes[i].r, nodes[i].t + nodes[i].r],
                        map = [];

                    for (l = a._pack_next; l !== a; l = l._pack_next) {
                        if (d3_layout_linearPackContain(t, [l.x - l.r, l.x + l.r])) {
                            var location = JSON.parse(JSON.stringify(d3_layout_pack2Place(l, l._pack_next, nodes[i])));
                            locations.push(location);
                            map.push(l);
                        }
                    }
                    if (d3_layout_linearPackContain(t, [l.x - l.r, l.x + l.r])) {
                        var location = JSON.parse(JSON.stringify(d3_layout_pack2Place(l, l._pack_next, nodes[i])));
                        locations.push(location);
                        map.push(l);
                    }

                    var location = locations[0],
                        index = 0;
                    locations.forEach(function (value, i) {
                        if (value.dist < location.dist) {
                            //if (nodes.some(function(node) {
                            //    if (d3_layout_packIntersects(node, value)) {
                            //        return true;
                            //    }
                            //})) {
                            //    return;
                            //}
                            location = value;
                            index = i;
                        }
                    });

                    nodes[i].x = location.x;
                    nodes[i].y = location.y;
                    a = map[index];
                    b = a._pack_next;

                    // Search for the closest intersection.
                    var isect = 0, s1 = 1, s2 = 1;
                    for (j = b._pack_next; j !== b; j = j._pack_next, ++s1) { // forward search
                        if (d3_layout_packIntersects(j, nodes[i])) {
                            isect = 1;
                            break;
                        }
                    }
                    if (isect == 1) { // backward search
                        for (k = a._pack_prev; k !== j._pack_prev; k = k._pack_prev, ++s2) {
                            if (d3_layout_packIntersects(k, nodes[i])) {
                                if (s2 < s1) {
                                    isect = -1;
                                    j = k;
                                    break;
                                }
                            }
                        }
                    }

                    // update node chain
                    if (isect == 0) {
                        d3_layout_packInsert(a, nodes[i]); b = nodes[i];
                        nodes[i].group = start;
                        bound(nodes[i]);

                        nodes[i].i = count;
                        count++;

                    } else if (isect > 0) {
                        delete b.i;
                        d3_layout_packSplice(a, j); b = j; --i;
                    } else if (isect < 0) {
                        delete a.i;
                        d3_layout_packSplice(j, b); a = j; --i;
                    }
                }
            } else { // start a new placement block

                console.log("new group----------" + nodes[i].t / 1200);

                start = i; bounds = [0, 0]; i--;
            }
            return i;
        }
    };

    linearPack.nodes = function (x) {
        if (!arguments.length) return nodes;
        nodes = x;
        return linearPack;
    };

    linearPack.size = function (x) {
        if (!arguments.length) return size;
        size = x;
        return linearPack;
    };

    linearPack.padding = function (x) {
        if (!arguments.length) return padding;
        padding = +x;
        return linearPack;
    };

    linearPack.scale = function (x) {
        if (!arguments.length) return scale;
        scale = x;
        return linearPack;
    };

    d3.rebind(linearPack, event, "on");
    return linearPack;
};

function d3_layout_packInsert(a, b) {
    var c = a._pack_next;
    a._pack_next = b;
    b._pack_prev = a;
    b._pack_next = c;
    c._pack_prev = b;
}

function d3_layout_packIntersects(a, b) {
    var dx = b.x - a.x,
        dy = b.y - a.y,
        dr = a.r + b.r;
    return .999 * dr * dr > dx * dx + dy * dy; // relative error within epsilon
}

function d3_layout_packLink(node) {
    node._pack_next = node._pack_prev = node;
}

function d3_layout_packUnlink(node) {
    delete node._pack_next;
    delete node._pack_prev;
}

function d3_layout_packSplice(a, b) {
    a._pack_next = b;
    b._pack_prev = a;
}

function d3_layout_pack2Place(a, b, c) { // https://github.com/MoritzStefaner/Elastic-Lists/blob/master/lib/flare/vis/operator/layout/CirclePackingLayout.as
    var db = a.r + c.r,
        dx = b.x - a.x,
        dy = b.y - a.y;
    if (db && (dx || dy)) {
        var da = b.r + c.r,
            dc = dx * dx + dy * dy;
        da *= da;
        db *= db;
        var x = .5 + (db - da) / (2 * dc),
            y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
        c.x = a.x + x * dx + y * dy;
        c.y = a.y + x * dy - y * dx;
    } else {
        c.x = a.x + db;
        c.y = a.y;
    }
    c.dist = Math.sqrt(Math.pow(c.x - c.t, 2) + Math.pow(c.y - 0, 2));
    //c.neighbour = a;
    return c;
}

function d3_layout_linearPackContain(a, b) {
    return !(a[1] < b[0] || b[1] < a[0]);
}

function d3_layout_linearPackCompare(a,b) {
    if (a.t < b.t)
        return -1;
    if (a.t > b.t)
        return 1;
    else {
        if(a.r < b.r) {
            return 1;
        }
        if (a.r > b.r) {
            return -1;
        }
        return 0;
    }
}

function d3_layout_linearPackMedian(nodes) {
    var m = nodes.map(function(v) {
        return v.r;
    }).sort(function(a, b) {
        return a - b;
    });

    var middle = Math.floor((m.length - 1) / 2);
    if (m.length % 2) {
        return m[middle];
    } else {
        return (m[middle] + m[middle + 1]) / 2.0;
    }
}

function d3_layout_linearPackMax(nodes) {
    var m = nodes.map(function(v) {
        return v.r;
    }).sort(function(a, b) {
        return a - b;
    });
    return m[m.length-1].r;
}