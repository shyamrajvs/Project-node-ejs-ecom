const User = require("../../model/userModel");
const Product = require("../../model/productModel");
const Category = require("../../model/categoryModel");
const Order = require("../../model/orderModel");
const Coupon = require('../../model/couponModel');







//load cart
const loadCart = async (req, res) => {
  try {
    const userData = await User.findById(req.session.user_id);
    const userCart = await User.findOne({ _id: req.session.user_id }).populate("cart.productId");
    const categories = await Category.find();
    const coupons = await Coupon.find();

    let grandTotal = 0;
    for (let i = 0; i < userCart.cart.length; i++) {
      grandTotal += parseInt(userCart.cart[i].productId.salePrice) * parseInt(userCart.cart[i].quantity);
    }

    let couponDiscount = 0;
    if (req.session.coupon) {
      couponDiscount = req.session.coupon.discount;
      grandTotal -= couponDiscount;
    }

    res.render("cart", {
      userCart: userCart,
      grandTotal: grandTotal,
      userData: userData,
      categories: categories,
      coupons: coupons,
      coupon: req.session.coupon 
    });
  } catch (error) {
    console.log("Error loading cart:", error);
    res.redirect('/error');
  }
};











//add to cart
const addToCart = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user_id;
    console.log(`ADDTOCART userId------${userId}`);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.quantity === 0) {
      return res.status(400).json({ message: "Product out of stock" });
    }

    const existingItem = user.cart.find(item => item.productId.equals(productId));

    if (existingItem) {
      console.log("Product already in cart, redirecting to cart");
      return res.redirect("/cart");
    } else {
      user.cart.push({ productId, quantity: 1 });
    }

    await user.save();

    console.log("Product added to cart");
    res.redirect("/cart");
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.redirect('/error');
  }
};











// change quantity in cart
const changeQuantity = async (req, res) => {
    try {
        const { productId, count } = req.body;
        const quantityChange = parseInt(count, 10);

        if (isNaN(quantityChange) || quantityChange === 0) {
            return res.status(400).json({ message: "Invalid quantity change provided." });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const userCart = await User.findOne({ _id: req.session.user_id });
        const cartItem = userCart.cart.find(item => item.productId.toString() === productId);

        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        const newQuantity = cartItem.quantity + quantityChange;
        if (newQuantity < 1 || newQuantity > product.quantity) {
            return res.status(400).json({ message: "Invalid quantity requested" });
        }

        cartItem.quantity = newQuantity;
        await userCart.save();

        res.status(200).json({ message: "Cart updated successfully", cart: userCart.cart });
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.status(500).json({ message: "Error updating quantity" });
    }
};











//delete cart item
const deleteCartItem = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productIdToDelete = req.params.id;

    console.log("productId to remove" + productIdToDelete);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("user" + user);
    user.cart = user.cart.filter(
      (item) => !item.productId.equals(productIdToDelete)
    );

    await user.save();

    console.log("Product removed from cart");

    res.redirect("/cart");
  }catch (error) {
    res.redirect('/error')
    
  }
};








//load checkout
const calculateTotal = (cart) => {
  let total = 0;
  cart.forEach((cartItem) => {
      total += cartItem.productId.salePrice * cartItem.quantity;
  });
  return total;
};








const loadCheckout = async (req, res) => {
  try {
      const userData = await User.findById(req.session.user_id);
      const userCart = await User.findOne({ _id: req.session.user_id }).populate(
          "cart.productId"
      );
      const categories = await Category.find();
      
      res.render("checkout", {
          user: userData,
          userCart: userCart,
          userData: userData,
          categories: categories,
          calculateTotal: calculateTotal 
      });
  }catch (error) {
    res.redirect('/error')
    
  }
};








const applyCoupon = async (req, res) => {
  try {
    const { couponName, cartTotal } = req.body;
    const coupon = await Coupon.findOne({ couponCode: String(couponName) });

    if (!coupon) {
      return res.json({ status: false, message: "Coupon not found." });
    }

    if (parseInt(cartTotal) < parseInt(coupon.minPrice)) {
      return res.json({ status: false, message: "Cart total is less than the minimum amount required for this coupon." });
    }

    const userId = req.session.user_id;
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ status: false, message: "User not found." });
    }

    if (coupon.users.some(item => String(item.userId) === String(user._id))) {
      return res.json({ status: false, message: "You have already used this coupon." });
    }

    const discountedTotal = parseInt(cartTotal) - parseInt(coupon.discount);

    req.session.coupon = {
      couponCode: coupon.couponCode,
      discount: coupon.discount,
      newTotal: discountedTotal
    };

    return res.json({ status: true, discount: coupon.discount, newTotal: discountedTotal });
  } catch (error) {
    console.log("Error in apply coupon", error);
    res.status(500).send('Internal server error');
  }
};







const removeCoupon = async (req, res) => {
  try {
    req.session.coupon = null; 
    return res.json({ status: true });
  } catch (error) {
    console.log("Error in remove coupon", error);
    res.status(500).send('Internal server error');
  }
};








module.exports = {
  loadCart,
  addToCart,
  changeQuantity,
  deleteCartItem,
  calculateTotal,
  loadCheckout,
  applyCoupon,
  removeCoupon
};