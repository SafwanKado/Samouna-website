const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Triggers when a new order is created.
 * Sends a push notification to the bakery owner.
 */
exports.sendOrderNotification = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const orderData = snapshot.data();
    const bakeryId = orderData.bakeryId;

    try {
      // 1. Get the bakery document
      const bakeryDoc = await admin.firestore().collection('bakeries').doc(bakeryId).get();
      if (!bakeryDoc.exists) {
        console.log(`Bakery ${bakeryId} not found.`);
        return null;
      }
      const bakeryData = bakeryDoc.data();
      const ownerId = bakeryData.ownerId;

      // 2. Get the owner's FCM token from their user document
      const ownerDoc = await admin.firestore().collection('users').doc(ownerId).get();
      if (!ownerDoc.exists) {
        console.log(`Owner ${ownerId} not found.`);
        return null;
      }
      const ownerData = ownerDoc.data();
      const fcmToken = ownerData.fcmToken;

      if (!fcmToken) {
        console.log(`Owner ${ownerId} has no FCM token.`);
        return null;
      }

      // 3. Prepare the notification payload
      const payload = {
        notification: {
          title: '🍞 New Order Received!',
          body: `You have a new order (#${context.params.orderId.slice(-6).toUpperCase()}) for ${bakeryData.name}.`,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK', // For mobile if needed, but works for web too
          icon: '/favicon.ico'
        },
        data: {
          orderId: context.params.orderId,
          type: 'NEW_ORDER'
        }
      };

      // 4. Send the notification
      const response = await admin.messaging().sendToDevice(fcmToken, payload);
      console.log('Successfully sent message:', response);
      return response;

    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  });

/**
 * Recalculates the bakery average rating when a new rating is added, updated, or removed.
 */
exports.updateBakeryRating = functions.firestore
  .document('bakeries/{bakeryId}/ratings/{ratingId}')
  .onWrite(async (change, context) => {
    const bakeryId = context.params.bakeryId;
    const ratingsRef = admin.firestore().collection('bakeries').doc(bakeryId).collection('ratings');
    
    try {
      const snapshot = await ratingsRef.get();
      let total = 0;
      let count = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && typeof data.rating === 'number') {
          total += data.rating;
          count++;
        }
      });
      
      const average = count > 0 ? (total / count) : 0;
      const roundedAverage = Math.round(average * 10) / 10; // Round to 1 decimal place
      
      await admin.firestore().collection('bakeries').doc(bakeryId).update({
        rating: roundedAverage,
        ratingCount: count
      });
      
      console.log(`Updated bakery ${bakeryId} rating to ${roundedAverage} based on ${count} ratings.`);
      return null;
    } catch (error) {
      console.error('Error updating bakery rating:', error);
      return null;
    }
  });
