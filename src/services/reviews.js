export async function submitReview({ agentId, propertyId, rating, comment }) {
  return { id: `rev_${Date.now()}`, agentId, propertyId, rating, comment, status: 'approved' };
}

export async function getReviewsForAgent(agentId) {
  return [];
}

export async function getAllReviews() {
  return [];
}

export async function moderateReview(reviewId, status) {
  return true;
}

export async function replyToReview({ reviewId, replyText, agentId }) {
  return true;
}
