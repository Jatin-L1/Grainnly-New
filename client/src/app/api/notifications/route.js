import { NextResponse } from 'next/server';

// In-memory notification store (in production, use Redis or database)
let notifications = [];
let notificationId = 1;

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, recipientAddress, recipientType, data, message } = body;

    console.log("📢 Creating notification:", { type, recipientAddress, recipientType, message });

    const notification = {
      id: notificationId++,
      type, // 'ration_dispatch', 'delivery_assignment', etc.
      recipientAddress: recipientAddress.toLowerCase(),
      recipientType, // 'shopkeeper', 'delivery'
      data,
      message,
      timestamp: Date.now(),
      read: false,
      status: 'pending' // 'pending', 'acknowledged', 'completed'
    };

    notifications.push(notification);

    console.log("✅ Notification created:", notification);

    return NextResponse.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientAddress = searchParams.get('recipientAddress')?.toLowerCase();
    const recipientType = searchParams.get('recipientType');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    console.log("📬 Fetching notifications for:", { recipientAddress, recipientType, unreadOnly });

    let filteredNotifications = notifications;

    if (recipientAddress) {
      filteredNotifications = filteredNotifications.filter(
        n => n.recipientAddress === recipientAddress
      );
    }

    if (recipientType) {
      filteredNotifications = filteredNotifications.filter(
        n => n.recipientType === recipientType
      );
    }

    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    }

    // Sort by timestamp (newest first)
    filteredNotifications.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`📬 Found ${filteredNotifications.length} notifications`);

    return NextResponse.json({
      success: true,
      notifications: filteredNotifications
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { notificationId, updates } = body;

    console.log("📝 Updating notification:", notificationId, updates);

    const notificationIndex = notifications.findIndex(n => n.id === notificationId);
    
    if (notificationIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    // Update notification
    notifications[notificationIndex] = {
      ...notifications[notificationIndex],
      ...updates,
      updatedAt: Date.now()
    };

    console.log("✅ Notification updated:", notifications[notificationIndex]);

    return NextResponse.json({
      success: true,
      notification: notifications[notificationIndex]
    });
  } catch (error) {
    console.error("❌ Error updating notification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
