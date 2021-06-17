module.exports = function(app,swig,gestorBD) {
    app.get("/productos", function(req, res) {
        let productos = [{
            "nombre" : "Manzana",
            "precio" : "3.2"
        }, {
                "nombre" : "Naranja",
                "precio" : "5.2"
            }];
        let respuesta = swig.renderFile('views/btienda.html', {
            vendedor : 'Tienda de productos',
            productos : productos
        });
        res.send(respuesta);
    });

    app.get('/productos/agregar', function (req, res) {

        let respuesta = swig.renderFile('views/bagregar.html', {

        });
        res.send(respuesta);
    });


    app.get('/suma', function(req, res) {
        let respuesta = parseInt(req.query.num1) + parseInt(req.query.num2);
        res.send(String(respuesta));
    });

    app.get('/productos/:id', function(req, res) {
        let respuesta = 'id: ' + req.params.id;
        res.send(respuesta);
    });
    app.get('/productos/:genero/:id', function(req, res) {
        let respuesta = 'id: ' + req.params.id + '<br>'
            + 'Género: ' + req.params.genero;
        res.send(respuesta);
    });

    app.post("/producto", function (req,res){
        let producto = {
            nombre : req.body.nombre,
            genero : req.body.genero,
            precio : req.body.precio,
            autor: req.session.usuario
        }
        // Conectarse
        gestorBD.insertarProducto(producto, function(id){
            if (id == null) {
                res.send("Error al insertar producto");
            } else {
                if (req.files.portada != null) {
                    var imagen = req.files.portada;
                    imagen.mv('public/portadas/' + id + '.png', function(err) {
                        if (err) {
                            res.send("Error al subir la portada");
                        } else {
                            if (req.files.audio != null) {
                                let audio = req.files.audio;
                                audio.mv('public/audios/'+id+'.mp3', function(err) {
                                    if (err) {
                                        res.send("Error al subir el audio");
                                    } else {
                                        res.redirect("/publicaciones");
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    });

    app.get("/tienda", function(req, res) {
        let criterio = {};
        if( req.query.busqueda != null ){
            criterio = { "nombre" : {$regex : ".*"+req.query.busqueda+".*"} };
        }
        let pg = parseInt(req.query.pg); // Es String !!!
        if ( req.query.pg == null){ // Puede no venir el param
            pg = 1;
        }
        gestorBD.obtenerProductosPg(criterio, pg , function(productos, total ) {
            if (productos == null) {
                res.send("Error al listar ");
            } else {
                let ultimaPg = total/4;
                if (total % 4 > 0 ){ // Sobran decimales
                    ultimaPg = ultimaPg+1;
                }
                let paginas = []; // paginas mostrar
                for(let i = pg-2 ; i <= pg+2 ; i++){
                    if ( i > 0 && i <= ultimaPg){
                        paginas.push(i);
                    }
                }
                let respuesta = swig.renderFile('views/btienda.html',{
                    productos : productos,
                    paginas : paginas,
                    actual : pg
                });
                res.send(respuesta);
            }
        });
    });

    app.get('/producto/:id', function (req, res) {
        let criterio = { "_id" : gestorBD.mongo.ObjectID(req.params.id) };
        gestorBD.obtenerProductos(criterio,function(productos){
            if ( productos == null ){
                res.send("Error al recuperar el producto.");
            } else {
                let respuesta = swig.renderFile('views/bproducto.html',
                    {
                        producto : productos[0]
                    });
                res.send(respuesta);
            }
        });
    });

    app.get("/publicaciones", function(req, res) {
        let criterio = { autor : req.session.usuario };
        gestorBD.obtenerProductos(criterio, function(productos) {
            if (productos == null) {
                res.send("Error al listar ");
            } else {
                let respuesta = swig.renderFile('views//bpublicaciones.html',
                    {
                        productos : productos
                    });
                res.send(respuesta);
            }
        });
    });


    app.get('/producto/eliminar/:id', function (req, res) {
        let criterio = {"_id" : gestorBD.mongo.ObjectID(req.params.id) };
        gestorBD.eliminarProducto(criterio,function(productos){
            if ( productos == null ){
                res.send(respuesta);
            } else {
                res.redirect("/publicaciones");
            }
        });
    })

    app.get('/producto/comprar/:id', function (req, res) {
        let productoId = gestorBD.mongo.ObjectID(req.params.id);
        let compra = {
            usuario : req.session.usuario,
            productoId : productoId
        }
        gestorBD.insertarCompra(compra ,function(idCompra){
            if ( idCompra == null ){
                res.send(respuesta);
            } else {
                res.redirect("/compras");
            }
        });
    });

    app.get('/compras', function (req, res){
        let criterio = {"usuario" : req.session.usuario};

        gestorBD.obtenerCompras(criterio, function (compras){
            if(compras == null){
                res.send("Error al listar ");
            } else
            {
                let productosCompradasIds = [];
                for(i=0; i<compras.length;i++)
                {
                    productosCompradasIds.push(compras[i].productoId);
                }
                let criterio = {"_id" : {$in: productosCompradasIds}}
                gestorBD.obtenerProductos(criterio, function (productos){
                    let respuesta = swig.renderFile('views/bcompras.html', {
                        productos : productos
                    });
                    res.send(respuesta);
                });
            }
        });
    })


};