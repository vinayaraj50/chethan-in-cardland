# Referral System Implementation Summary

## Overview
Implemented a secure, abuse-resistant referral system that rewards users only when they refer genuine first-time users who complete a qualified lesson.

## Key Features

### 1. **First-Time User Validation**
- Referral codes can only be applied by users who have never completed any lessons
- Server validates `totalReviews === 0` before accepting referral code
- Prevents abuse through dummy accounts

### 2. **Pending → Completed Flow**
- Referral is marked as `pending` when code is applied
- Reward (50 coins) is granted to referrer only when new user completes first **qualified** lesson
- Status changes to `completed` after reward is granted

### 3. **Qualified Lesson Rules**
Referral bonus is awarded only for:
- ✅ Published lessons (from Firestore)
- ❌ NOT demo lessons (`id === 'demo-lesson'`)
- ❌ NOT user-created lessons (no `lessonId` or `storagePath`)

### 4. **Abuse Prevention**
- Self-referral blocked (checks `referrerId !== uid`)
- One referral code per user (checks `referredBy` field)
- Server-side validation ensures client can't bypass rules
- Transaction-based updates prevent race conditions

## Backend Changes

### `functions/src/controllers/studentCoinController.js`

#### Updated `applyReferral`
```javascript
- Immediate coin reward removed
+ Validates first-time user (totalReviews === 0)
+ Stores referral as 'pending' status
+ Saves referrerId for later reward
+ Returns clear message about when reward will be granted
```

#### New `checkReferralCompletion`
```javascript
+ Called after lesson completion
+ Validates lesson qualifies (not demo, not user-created)
+ Awards 50 coins to referrer
+ Marks referral as 'completed'
+ Creates audit log in transactions collection
+ Returns reward status to show success message
```

### `functions/index.js`
- Exported `checkReferralCompletion` function

## Frontend Changes

### `src/services/userService.js`
- Added `checkReferralCompletion()` client function

### `src/hooks/useReviewSession.js`
- Added referral check after lesson completion
- Calls `userService.checkReferralCompletion()` with lesson metadata
- Shows success alert if referrer was rewarded
- Silent fail if error (doesn't interrupt user experience)

### `src/components/ReferralModal.jsx`
- Updated copy to clearly state requirements:
  - "Invite a **first-time user**"
  - "when they complete their first lesson"
  - Note about demo/user-created lessons not counting
- Updated `handleSubmitCode` to use server response message
- Added page reload after successful code application

## User Flow

### Referrer (Person A)
1. Opens Referral Modal
2. Shares referral code/link with friend
3. Waits for friend to complete first lesson
4. Receives 50 coins + notification when friend completes

### Referred User (Person B - New User)
1. Signs up for first time
2. Enters referral code in modal
3. Sees message: "Your referrer will receive coins when you complete your first lesson"
4. Completes a published lesson (not demo, not self-created)
5. Sees success message: "Your referrer received 50 coins!"
6. Referral status changes from 'pending' to 'completed'

## Database Schema

### User Document Fields Added
```javascript
{
  referredBy: string,           // Referral code used
  referrerId: string,            // UID of referrer
  referralStatus: 'pending' | 'completed',
  referralAppliedAt: timestamp,
  referralCompletedAt: timestamp
}
```

### Transaction Log Entry
```javascript
{
  userId: referrerId,
  type: 'referral_bonus',
  referredUserId: uid,
  lessonId: string,
  delta: 50,
  timestamp: serverTimestamp()
}
```

## Testing Checklist

- [ ] New user can apply referral code
- [ ] Existing user (with reviews) cannot apply referral code
- [ ] User cannot refer themselves
- [ ] User cannot apply multiple referral codes
- [ ] Completing demo lesson does NOT trigger reward
- [ ] Completing user-created lesson does NOT trigger reward
- [ ] Completing published lesson DOES trigger reward
- [ ] Referrer receives exactly 50 coins
- [ ] Referral status changes from 'pending' to 'completed'
- [ ] Transaction log is created
- [ ] Success message is shown to referred user
- [ ] Error messages are clear and helpful

## Security Considerations

✅ All validation on server-side
✅ Transaction-based updates (atomic)
✅ Prevents double-reward (status check)
✅ Prevents self-referral
✅ Prevents abuse via dummy accounts
✅ Audit trail in transactions collection
✅ No client-side coin manipulation possible
