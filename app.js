
//Módulos
let express = require('express');
let app = express();

let fs = require('fs');
let https = require('https');

let crypto = require('crypto');
let expressSession = require('express-session');
app.use(expressSession({
    secret: 'abcdefg',
    resave: true,
    saveUninitialized: true
}));

// Variables
app.set('port', 8081);
app.use(express.static('public'));
app.set('db', 'mongodb://admin:sdi@wallapopsdi-shard-00-00.qmudf.mongodb.net:27017,wallapopsdi-shard-00-01.qmudf.mongodb.net:27017,wallapopsdi-shard-00-02.qmudf.mongodb.net:27017/test?ssl=true&replicaSet=atlas-9sioe3-shard-0&authSource=admin&retryWrites=true&w=majority');
app.set('clave','abcdefg');
app.set('crypto',crypto);

let fileUpload = require('express-fileupload');
app.use(fileUpload());
let mongo = require('mongodb');
let swig = require('swig');
let bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let gestorBD = require("./modules/gestorBD.js");
gestorBD.init(app,mongo);

// routerUsuarioSession
var routerUsuarioSession = express.Router();
routerUsuarioSession.use(function(req, res, next) {
    console.log("routerUsuarioSession");
    if ( req.session.usuario ) {
        // dejamos correr la petición
        next();
    } else {
        console.log("va a : "+req.session.destino)
        res.redirect("/identificarse");
    }
});
//Aplicar routerUsuarioSession
app.use("/productos/agregar",routerUsuarioSession);
app.use("/publicaciones",routerUsuarioSession);

//routerUsuarioAutor
let routerUsuarioAutor = express.Router();
routerUsuarioAutor.use(function(req, res, next) {
    console.log("routerUsuarioAutor");
    let path = require('path');
    let id = path.basename(req.originalUrl);
// Cuidado porque req.params no funciona
// en el router si los params van en la URL.
    gestorBD.obtenerProductos(
        {_id: mongo.ObjectID(id) }, function (productos) {
            console.log(productos[0]);
            if(productos[0].autor == req.session.usuario ){
                next();
            } else {
                res.redirect("/tienda");
            }
        })
});
//Aplicar routerUsuarioAutor
app.use("/producto/modificar",routerUsuarioAutor);
app.use("/producto/eliminar",routerUsuarioAutor);


//routerAudios
let routerAudios = express.Router();
routerAudios.use(function(req, res, next) {
    console.log("routerAudios");
    let path = require('path');
    let idProducto = path.basename(req.originalUrl, '.mp3');
    gestorBD.obtenerProductos(
        {"_id": mongo.ObjectID(idProducto) }, function (productos) {
            if(req.session.usuario && productos[0].autor == req.session.usuario ){
                next();
            } else {
                let criterio = {
                    usuario : req.session.usuario,
                    cancionId : mongo.ObjectID(idCancion)
                };

                gestorBD.obtenerCompras(criterio ,function(compras){
                    if (compras != null && compras.length > 0 ){
                        next();
                    } else {
                        res.redirect("/tienda");
                    }
                });

            }
        })
});
//Aplicar routerAudios
app.use("/audios/",routerAudios);


//Rutas/controladores por lógica
require("./routes/rusuarios.js")(app, swig, gestorBD);
require("./routes/rproductos.js")(app, swig, gestorBD);
app.use("/producto/comprar",routerUsuarioSession);
app.use("/compras",routerUsuarioSession);

app.get('/', function (req, res) {
    res.redirect('/tienda');
})

app.use( function (err,req,res,next ){
    console.log("Error producido: " + err);
    if(! res.headersSent){
        res.status(400);
        res.send("Recurso no disponible");
    }
});

//lanzar el servidor
https.createServer({
    key: fs.readFileSync('certificates/alice.key'),
    cert: fs.readFileSync('certificates/alice.crt')
}, app).listen(app.get('port'), function() {
    console.log("Servidor activo");
});