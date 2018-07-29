const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  req.body.author = req.user.id;
  req.body.store = req.params.id; // from the url is the store
  const newReview = new Review(req.body);
  await newReview.save();
  req.flash('success', 'Review Saved!');
  res.redirect('back');
};
