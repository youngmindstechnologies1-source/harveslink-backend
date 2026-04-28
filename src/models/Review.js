const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // One review per order
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for farmer reviews
reviewSchema.index({ farmerId: 1, createdAt: -1 });

// Index for customer reviews
reviewSchema.index({ customerId: 1 });

// After saving a review, update farmer's average rating
reviewSchema.post('save', async function () {
  const Review = this.constructor;
  const Farmer = mongoose.model('Farmer');

  const stats = await Review.aggregate([
    { $match: { farmerId: this.farmerId } },
    {
      $group: {
        _id: '$farmerId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Farmer.findByIdAndUpdate(this.farmerId, {
      'rating.average': Math.round(stats[0].averageRating * 10) / 10,
      'rating.count': stats[0].totalReviews,
    });
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
