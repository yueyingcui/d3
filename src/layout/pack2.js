/**
 * Created by ycui on 4/29/2015.
 */
//import "layout";

d3.layout.pack2 = function () {
    var pack2 = {},
        event = d3.dispatch("start"),
        nodes = [],
        xMin = Infinity,
        xMax = -Infinity,
        yMin = Infinity,
        yMax = -Infinity,
        padding = 0,
        size = [1, 1];

    function bound(node) {
        xMin = Math.min(node.x - node.r, xMin);
        xMax = Math.max(node.x + node.r, xMax);
        yMin = Math.min(node.y - node.r, yMin);
        yMax = Math.max(node.y + node.r, yMax);
    }

    pack2.start = function () {
        var n = nodes.length,
            start = 0,
            bounds = [0, 0],
            a, b, c, i, j, k;

        // Create node links.
        nodes.forEach(d3_layout_packLink);

        // Create first node.
        a = nodes[0];
        a.x = -a.r;
        a.y = 0;
        bound(a);

        // Create second node.
        if (n > 1) {
            b = nodes[1];
            b.x = b.r;
            b.y = 0;
            bound(b);

            // Create third node and build front-chain.
            if (n > 2) {
                c = nodes[2];
                d3_layout_packPlace(a, b, c);
                bound(c);
                d3_layout_packInsert(a, c);
                a._pack_prev = c;
                d3_layout_packInsert(c, b);
                b = a._pack_next;

                // Now iterate through the rest.
                for (i = 3; i < n; i++) {
                    d3_layout_packPlace(a, b, c = nodes[i]);

                    // Search for the closest intersection.
                    var isect = 0, s1 = 1, s2 = 1;
                    for (j = b._pack_next; j !== b; j = j._pack_next, ++s1) { // forward search
                        if (d3_layout_packIntersects(j, c)) {
                            isect = 1;
                            break;
                        }
                    }
                    if (isect == 1) { // backward search
                        for (k = a._pack_prev; k !== j._pack_prev; k = k._pack_prev, ++s2) {
                            if (d3_layout_packIntersects(k, c)) {
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
                        d3_layout_packInsert(a, c); b = c;
                    } else if (isect > 0) {
                        d3_layout_packSplice(a, j); b = j; --i;
                    } else if (isect < 0) {
                        d3_layout_packSplice(j, b); a = j; --i;
                    }
                }
            }
        }

        // Re-center the circles and compute the encompassing radius.
        var cx = (xMin + xMax) / 2,
            cy = (yMin + yMax) / 2,
            cr = 0;
        for (i = 0; i < n; i++) {
            c = nodes[i];
            c.x -= cx;
            c.y -= cy;
            cr = Math.max(cr, c.r + Math.sqrt(c.x * c.x + c.y * c.y));
        }
    };

    pack2.nodes = function (x) {
        if (!arguments.length) return nodes;
        nodes = x;
        return pack2;
    };

    pack2.size = function (x) {
        if (!arguments.length) return size;
        size = x;
        return pack2;
    };

    pack2.padding = function (x) {
        if (!arguments.length) return padding;
        padding = +x;
        return pack2;
    };

    return d3.rebind(pack2, event, "on");
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

function d3_layout_packSplice(a, b) {
    a._pack_next = b;
    b._pack_prev = a;
}

function d3_layout_packPlace(a, b, c) { // https://github.com/MoritzStefaner/Elastic-Lists/blob/master/lib/flare/vis/operator/layout/CirclePackingLayout.as
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
}