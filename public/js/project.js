const getJSONString = function (obj) { return JSON.stringify(obj, null, 2); }

const express = require('express');
const bcrypt = require("bcryptjs");
const app = express();

const layout = require("express-ejs-layouts");

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(layout);


var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cookieParser = require("cookie-parser");
const session = require('express-session');
const flash = require('connect-flash');
app.use(session({
	secret: '1234567',
	resave: true,
	saveUninitialized: true
}))
app.use(cookieParser());

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://127.0.0.1:27017/cis485", { useUnifiedTopology: true, useNewUrlParser: true });

var loginSchema = new mongoose.Schema({
	userid: String,
	password: String
});

var cartSchema = new mongoose.Schema({
	userid: String,
	code: String,
	name: String,
	price: Number,
	quantity: Number
});

var catalogSchema = new mongoose.Schema({
	code: String,
	name: String,
	description: String,
	price: Number,
	quantity: Number
});

mongoose.pluralize(null);

var User = mongoose.model("login", loginSchema);
var Cart = mongoose.model("cart", cartSchema);
var Catalog = mongoose.model("catalog", catalogSchema);

app.use((req, res, next) => {
	console.log(`request made to: ${req.url}`);
	next();
});
app.get("/", function (req, res) {
	res.render("login.ejs", { message: "", flag: "" });
});
//LOGIN
app.get("/login", function (req, res) {
	res.render("login.ejs", { message: "", flag: "" });
});
app.post("/login", (req, res) => {
	User.findOne({ userid: req.body.userid }, '')
		.then(function (data) {
			if (data == null) {
				res.render("login", { message: "Invalid Login", flag: "" });
			} else {
				bcrypt.compare(req.body.password, data.password, function (err, result) {
					if (result) {
						req.session.userid = req.body.userid;
						req.session["flag"] = "1";
						res.redirect("/products");
					} else {
						res.render("login", { message: "Invalid Login", flag: "" });
					}
				});
			}
		})
		.catch(function (error) {
			// Handle error
		});
});
//REGISTER
app.get("/register", function (req, res) {
	res.render("register.ejs", { message: "", flag: "" });
});
app.post("/register", (req, res) => {
	User.findOne({ userid: req.body.userid }, '', function (err, data) {
		if (err) return handleError(err);
		if (data == null) {
			if (req.body.password === req.body.password2) {
				bcrypt.hash(req.body.password, 5, function (err, hashpass) {
					console.log("hashpassword=" + hashpass);
					req.body.password = hashpass;
					var x = new User(req.body);
					x.save(function (err) {
						if (err) return handleError(err);
						res.render("login", { message: 'Registration Successful', flag: "" });
					});
				});
			} else {
				res.render("register", { message: 'ERROR: Passwords Do Not Match', flag: "" });
			}
		} else {
			res.render("register", { message: 'ERROR: User Already In Database', flag: "" });
		}
	});
});
//ABOUT
app.get("/about", function (req, res) {
	if (req.session.flag != "1") {
		res.render("about.ejs", { message: "", flag: "" })
	}
	else {
		res.render("about.ejs", { message: "", flag: "1" })
	}
});
//CONTACT
app.get("/contact", function (req, res) {
	if (req.session.flag != "1") {
		res.render("contact.ejs", { message: "", flag: "" })
	}
	else {
		res.render("contact.ejs", { message: "", flag: "1" })
	}
});
//PRODUCTS
app.get("/products", (req, res) => {
	if (req.session.flag != "1") res.render("login", { message: "Session Expired", flag: "" });//STEP04-SESSION VALIDATION
	console.log("body=" + getJSONString(req.body));
	var msg = "No MSG";
	var message = "";
	const item2find = new Object();

	Catalog.find(item2find, '', function (err, data) {
		var catalog = ""
		if (err) return handleError(err);
		console.log("result=" + getJSONString(data));
		if (data == "") {
			var cart = "CART EMPTY<br><a href='/products'>Back To Shopping</a>";
			res.render("products.ejs", { cart: cart, message: "", flag: "1" });
		}
		else {
			let catalog = "";

			for (var i = 0; i < data.length; i++) {
				var image = "images/" + data[i].code + ".jpg";
				catalog +=
					`
					<div class="el-wrapper">
      <div class="container page-wrapper">
        <div class="page-inner">
          <div class="row">
            <div class="box-up">
              <div id="productlist_name" ><a id="product_link" href="${data[i].code}">${data[i].name}</a></div>
              <img class="img" src='${image}'>
              <div class="img-info">
                <div class="info-inner"></div>
                <div class="a-size">${data[i].description}</div>
              </div>
            </div>

            <div class="box-down">
              <div class="h-bg">
                <div class="h-bg-inner"></div>
              </div>

              <a class="cart" href="#">
                <span class="price">${data[i].price}</span>
                <span class="add-to-cart">
                  <span class="txt"><input class="addtocart_button" type="button" onclick="addItem('${data[i].code}','${data[i].name}',${data[i].price});" value="addToCart" /></span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
`			}
			res.render("products.ejs", { catalog: catalog, message: "", flag: "1" });
		}

	});
});
//////////////////////////////////////////////////////////////////////////////


app.get("/checkout", function (req, res) {
	console.log("body=" + getJSONString(req.body));
	var msg = "No MSG";
	var flag = 0;
	var message = "";
	const item2find = new Object();
	item2find.userid = req.session.userid;
	Cart.find(item2find, '', function (err, data) {
		var cart = "";
		if (err) return handleError(err);
		console.log("result=" + getJSONString(data));
		if (data == "") console.log("EMPTY");
		console.log("flag=" + flag);
		if (data == "") {
			var cart = "CART EMPTY<br><a href='/products'>Back To Shopping</a>";
			res.render("cart.ejs", {
				cart: cart,
				flag: req.session.flag,
				message: ""
			});
		} else {
			var cart = "<table class='cart_table'><thead class='table_head23'><tr><td>Image</td><td>Product Name</td><td>Quantity</td><td>Price</td><td>Sub-Total</td><td>Remove Item</td></tr></thead><tbody>";
			var total = 0;
			for (var i = 0; i < data.length; i++) {
				var image = data[i].code + ".jpg";
				cart += "<tr class='cartmainrow' ><td><img class='imgforcart' src='images/" + image + "'/></td><td>" + data[i].name + "</td><td><form method='post' action='/change'><input type='hidden' name='code' value='" + data[i].code + "' /><input class='qty-input' style='width:50px;' type='number' name='quantity' value='" + data[i].quantity + "' min='1' /><button type='submit' class='update-btn'>Update</button></form></td><td>$" + data[i].price.toFixed(2) + "</td><td>$" + (parseFloat(data[i].price) * parseInt(data[i].quantity)).toFixed(2) + "</td><td><a href='/delete:" + data[i].code + "'><img class='delete-btn' style='width: 20px;' src='images/x.png' /></a></td></tr>";
				total = total + (parseFloat(data[i].price) * parseInt(data[i].quantity));
			}
			cart += "</tbody><tfoot><tr><td colspan='4'>GRAND TOTAL:</td><td class='right'>$" + total.toFixed(2) + "</td></tr></tfoot></table></div>";
			if (total == 0) cart += "<div class='back-to-shopping'><a href='/products2'>GO BACK SHOPPING</a></div>";
			// Empty the cart
			Cart.deleteMany(item2find, function (err) {
				if (err) return handleError(err);
				console.log("Cart is empty!");
				res.render("checkout.ejs", {
					cart: cart,
					flag: req.session.flag,
					message: ""
				});
			});
		}
	});
});


//////////////////////////////////////////////////////////////////////////////
app.get("/end", function (req, res) {
	if (req.session.flag = "1") res.render("end.ejs", { message: "", flag: "1" });
});
app.get("/contactreply", function (req, res) {
	if (req.session.flag = "1") res.render("contactreply.ejs", { message: "", flag: "1" });
});
app.get("/home", function (req, res) {
	if (req.session.flag = "1") res.render("home.ejs", { message: "", flag: "1" });
});
app.get("/acer", function (req, res) {
	if (req.session.flag = "1") res.render("acer.ejs", { message: "", flag: "1" });
});
app.get("/airpods", function (req, res) {
	if (req.session.flag = "1") res.render("airpods.ejs", { message: "", flag: "1" });
});
app.get("/dell", function (req, res) {
	if (req.session.flag = "1") res.render("dell.ejs", { message: "", flag: "1" });
});
app.get("/dysondc58", function (req, res) {
	if (req.session.flag = "1") res.render("dysondc58.ejs", { message: "", flag: "1" });
});
app.get("/hpdesktop", function (req, res) {
	if (req.session.flag = "1") res.render("hpdesktop.ejs", { message: "", flag: "1" });
});
app.get("/mac", function (req, res) {
	if (req.session.flag = "1") res.render("mac.ejs", { message: "", flag: "1" });
});
app.get("/powerbank", function (req, res) {
	if (req.session.flag = "1") res.render("powerbank.ejs", { message: "", flag: "1" });
});
app.get("/samsungs23", function (req, res) {
	if (req.session.flag = "1") res.render("samsungs23.ejs", { message: "", flag: "1" });
});
app.get("/thermostat", function (req, res) {
	if (req.session.flag = "1") res.render("thermostat.ejs", { message: "", flag: "1" });
});
app.get("/tile", function (req, res) {
	if (req.session.flag = "1") res.render("tile.ejs", { message: "", flag: "1" });
});
/////////////////////////////////////////////////////////////////////////////
app.post("/add", (req, res) => {
	const item2find = new Object();
	item2find.code = req.body.code;
	item2find.userid = req.session.userid;//STEP04
	Cart.find(item2find, '', function (err, data) {
		if (err) return handleError(err);
		if (data == "") {
			const item = new Object();
			item.userid = req.session.userid;//STEP05
			item.code = req.body.code;
			item.name = req.body.name;
			item.quantity = req.body.quantity;
			item.price = req.body.price;
			console.log(getJSONString(item));
			var x = new Cart(item);
			x.save(function (err) {
				if (err) return handleError(err);
			});
		}
		else {
			const item2update = new Object();
			item2update.code = req.body.code;
			item2update.userid = req.session.userid;//STEP06
			const update = new Object();
			update.quantity = parseInt(data[0].quantity) + 1;;
			Cart.updateOne(item2update, update, function (err, result) {
				if (err) console.log("ERROR=" + err);
				else console.log("RECORD UPDATED");
			});
		}
		res.redirect("/products");
	});
});

app.get("/cart", (req, res) => {
	console.log("body=" + getJSONString(req.body));
	var msg = "No MSG";
	var flag = 0;
	var message = "";
	const item2find = new Object();
	//item2find.code=req.body.code;
	item2find.userid = req.session.userid;

	Cart.find(item2find, '', function (err, data) {
		var cart = ""
		if (err) return handleError(err);
		console.log("result=" + getJSONString(data));
		//console.log("code="+data[0].code+" name="+data[0].name);
		if (data == "") console.log("EMPTY");
		console.log("flag=" + flag);
		if (data == "") {
			var cart = "<a href='/products'><div class='empty_cart'>Cart is empty<br>Back To Shopping</div></a>";
			res.render("cart.ejs", { cart: cart, flag: req.session.flag, message: "" });
		}
		else {
			var cart = "<table class='cart_table23'><thead class='table_head23'><tr><td>Image</td><td>Product Name</td><td>Quantity</td><td>Price</td><td>Sub-Total</td><td>Remove Item</td></tr></thead><tbody>";
			var total = 0;
			for (var i = 0; i < data.length; i++) {
				var image = data[i].code + ".jpg";
				cart += "<tr class='cartmainrow' ><td><img class='imgforcart' src='images/" + image + "'/></td><td>" + data[i].name + "</td><td><form method='post' action='/change'><input type='hidden' name='code' value='" + data[i].code + "' /><input class='qty-input' style='width:50px;' type='number' name='quantity' value='" + data[i].quantity + "' min='1' /><button type='submit' class='update-btn'>Update</button></form></td><td>$" + data[i].price.toFixed(2) + "</td><td>$" + (parseFloat(data[i].price) * parseInt(data[i].quantity)).toFixed(2) + "</td><td><a href='/delete:" + data[i].code + "'><img class='delete-btn' style='width: 20px;' src='images/x.png' /></a></td></tr>";
				total = total + (parseFloat(data[i].price) * parseInt(data[i].quantity));
			}
			cart += "</tbody><tfoot><tr><td colspan='4'>GRAND TOTAL:</td><td class='right'>$" + total.toFixed(2) + "</td></tr></tfoot></table></div>";
			if (total == 0) cart += "<div class='back-to-shopping'><a href='/products2'>GO BACK SHOPPING</a></div>";
			else cart += "<br><div class='empty_cart'><a href='/checkout'>Checkout</a></div>";


			res.render("cart.ejs", { cart: cart, flag: req.session.flag, message: "" });
		}

	});
});
app.post("/change", (req, res) => {
	const item2find = new Object();
	item2find.code = req.body.code;
	item2find.userid = req.session.userid;

	Cart.find(item2find, '', function (err, data) {
		if (err) return handleError(err);

		var qty = parseInt(req.body.quantity);
		if (qty <= 0) {
			Cart.findOneAndDelete(item2find, function (err) {
				if (err) console.log(err);
				console.log("Successful deletion");
			});
		}
		else {
			const item2update = new Object();
			item2update.code = req.body.code;
			item2update.userid = req.session.userid;

			const update = new Object();
			update.quantity = req.body.quantity;

			Cart.updateOne(item2update, update, function (err, result) {
				if (err) console.log("ERROR=" + err);
				else console.log("RECORD UPDATED");
			});
		}
		res.redirect('/cart');
		//res.render ( "cart.ejs");
	});
});

app.get("/delete:code", (req, res) => {
	const item2find = new Object();
	console.log("param=" + req.params.code);
	var code = req.params.code.substring(1);
	console.log("code=" + code);
	item2find.code = code;
	item2find.userid = req.session.userid;
	Cart.findOneAndDelete(item2find, function (err) {
		if (err) console.log(err);
		console.log("Successful deletion");
	});
	res.redirect('/cart');
});

app.get("/logoff", function (req, res) {
	if (req.session.flag == "1") res.render("logoff.ejs", { message: "", flag: "1" });
	else res.render("login.ejs", { message: "Must Login First", flag: "" });
});

app.post("/logoff", (req, res) => {
	console.log("POST LOGOFF");
	req.session.destroy(function (err) {
		//res.render ( "login.ejs",{message:"Logoff Successful...",flag:""});

		//req.session.flag="";
		//req.flash('message', 'Logoff Successful...');
		res.redirect("/login");
	});
});
app.listen(3000, function () { console.log("Server Activated!") })

