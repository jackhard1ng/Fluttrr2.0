/**
 * Fluttrr Database Seed Script
 * Populates the database with KC-themed test data:
 *   - 3 users
 *   - 3 businesses (1 pending, 2 verified)
 *   - 12 events across categories
 *   - Attendees, chats, messages, moments, reviews, notifications
 *
 * Usage: node prisma/seed.js
 * Requires: DATABASE_URL set, prisma client generated
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

const PASSWORD_HASH = bcrypt.hashSync('Test1234!', 10);

// ─── IDs ─────────────────────────────────────────────────
const userId1 = randomUUID();
const userId2 = randomUUID();
const userId3 = randomUUID();

const bizId1 = randomUUID();
const bizId2 = randomUUID();
const bizId3 = randomUUID();

async function main() {
  console.log('🌱 Seeding Fluttrr database…');

  // ─── Users ───────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alex@test.com' },
      update: {},
      create: {
        id: userId1,
        email: 'alex@test.com',
        passwordHash: PASSWORD_HASH,
        username: 'alexkc',
        displayName: 'Alex Johnson',
        bio: 'KC local. Love live music and street tacos.',
        profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
        city: 'Kansas City',
        lat: 39.0997,
        lng: -94.5786,
        emailVerified: true,
        role: 'ADMIN', // This user also has admin role for testing
      },
    }),
    prisma.user.upsert({
      where: { email: 'mia@test.com' },
      update: {},
      create: {
        id: userId2,
        email: 'mia@test.com',
        passwordHash: PASSWORD_HASH,
        username: 'miakc',
        displayName: 'Mia Chen',
        bio: 'Fitness junkie 💪 Crossroads regular',
        profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mia',
        city: 'Kansas City',
        lat: 39.0836,
        lng: -94.5859,
        emailVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'jamal@test.com' },
      update: {},
      create: {
        id: userId3,
        email: 'jamal@test.com',
        passwordHash: PASSWORD_HASH,
        username: 'jamalkc',
        displayName: 'Jamal Williams',
        bio: 'Foodie & sports fan. Go Chiefs! 🏈',
        profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jamal',
        city: 'Kansas City',
        lat: 39.0489,
        lng: -94.6005,
        emailVerified: true,
      },
    }),
  ]);
  console.log(`  ✅ ${users.length} users created`);

  // ─── Businesses ──────────────────────────────────────────
  const businesses = await Promise.all([
    prisma.business.upsert({
      where: { email: 'crossroads@test.com' },
      update: {},
      create: {
        id: bizId1,
        email: 'crossroads@test.com',
        passwordHash: PASSWORD_HASH,
        businessName: 'Crossroads Social Club',
        description: 'Neighborhood bar & event space in the heart of the Crossroads Arts District. Live music, trivia, and good vibes.',
        address: '2000 Baltimore Ave, Kansas City, MO 64108',
        city: 'Kansas City',
        lat: 39.0836,
        lng: -94.5859,
        phone: '816-555-0101',
        website: 'https://crossroadssocial.example.com',
        verified: true,
        status: 'ACTIVE',
      },
    }),
    prisma.business.upsert({
      where: { email: 'westport@test.com' },
      update: {},
      create: {
        id: bizId2,
        email: 'westport@test.com',
        passwordHash: PASSWORD_HASH,
        businessName: 'Westport Fitness Co',
        description: 'Outdoor boot camps, yoga in the park, and community fitness events in Westport.',
        address: '4000 Broadway Blvd, Kansas City, MO 64111',
        city: 'Kansas City',
        lat: 39.0552,
        lng: -94.5937,
        phone: '816-555-0202',
        verified: true,
        status: 'ACTIVE',
      },
    }),
    prisma.business.upsert({
      where: { email: 'rivermarket@test.com' },
      update: {},
      create: {
        id: bizId3,
        email: 'rivermarket@test.com',
        passwordHash: PASSWORD_HASH,
        businessName: 'River Market Eats',
        description: 'Pop-up food events and tasting tours through the River Market district.',
        address: '500 Grand Blvd, Kansas City, MO 64106',
        city: 'Kansas City',
        lat: 39.1064,
        lng: -94.5832,
        phone: '816-555-0303',
        verified: false,
        status: 'PENDING',
      },
    }),
  ]);
  console.log(`  ✅ ${businesses.length} businesses created`);

  // ─── Events ──────────────────────────────────────────────
  const today = new Date();
  const day = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const eventData = [
    { bizId: bizId1, title: 'Trivia Tuesday',        cat: 'GAMES',      start: '7:00 PM',  end: '9:00 PM',  date: day(1),  area: 'Crossroads',      emoji: '🧠', color: '#8B5CF6', max: 40, desc: 'Bring your crew for free trivia with prizes every round. Pizza & drink specials all night.' },
    { bizId: bizId1, title: 'Live Jazz Night',        cat: 'MUSIC',      start: '8:00 PM',  end: '11:00 PM', date: day(3),  area: 'Crossroads',      emoji: '🎷', color: '#EC4899', max: null, desc: 'Kansas City jazz at its finest. Featured local trio performing original compositions.' },
    { bizId: bizId1, title: 'Art Walk After-Party',   cat: 'ARTS',       start: '9:00 PM',  end: null,       date: day(5),  area: 'Crossroads',      emoji: '🎨', color: '#F97316', max: 60, desc: 'First Friday Art Walk continues here. Meet the artists, sip craft cocktails, enjoy live painting.' },
    { bizId: bizId1, title: 'Saturday Social Mixer',  cat: 'SOCIAL',     start: '6:00 PM',  end: '9:00 PM',  date: day(6),  area: 'Crossroads',      emoji: '🥂', color: '#A855F7', max: 50, desc: 'Meet new people in KC! Icebreakers, conversation starters, and half-price appetizers.' },
    { bizId: bizId2, title: 'Sunrise Bootcamp',       cat: 'FITNESS',    start: '6:00 AM',  end: '7:00 AM',  date: day(1),  area: 'Westport',        emoji: '💪', color: '#06B6D4', max: 25, desc: 'High-intensity outdoor workout. All fitness levels welcome. Bring water and a mat.' },
    { bizId: bizId2, title: 'Yoga in Loose Park',     cat: 'FITNESS',    start: '9:00 AM',  end: '10:00 AM', date: day(2),  area: 'Plaza',           emoji: '🧘', color: '#06B6D4', max: 30, desc: 'Vinyasa flow surrounded by nature. Mats provided. Stay for coffee after!' },
    { bizId: bizId2, title: 'Sports Bar Watch Party',  cat: 'SPORTS',     start: '12:00 PM', end: '4:00 PM',  date: day(7),  area: 'Westport',        emoji: '🏈', color: '#10B981', max: null, desc: 'Watch the Chiefs game on the big screens. Drink specials and wing deals all game long.' },
    { bizId: bizId2, title: 'Run Club: Plaza Loop',   cat: 'FITNESS',    start: '6:30 PM',  end: '7:30 PM',  date: day(4),  area: 'Plaza',           emoji: '🏃', color: '#06B6D4', max: 40, desc: '5K loop around the Country Club Plaza. All paces welcome. Social drinks after!' },
    { bizId: bizId1, title: 'Taco & Tequila Night',   cat: 'FOOD_DRINK', start: '5:00 PM',  end: '9:00 PM',  date: day(2),  area: 'Southwest Blvd',  emoji: '🌮', color: '#F59E0B', max: null, desc: '$3 street tacos and $5 margaritas. Live mariachi music from 7-9pm.' },
    { bizId: bizId1, title: 'Coding & Coffee',        cat: 'EDUCATION',  start: '10:00 AM', end: '12:00 PM', date: day(3),  area: 'River Market',    emoji: '💻', color: '#3B82F6', max: 20, desc: 'Co-working session for developers. Lightning talks, code review, free coffee.' },
    { bizId: bizId1, title: 'P&L Pub Crawl',          cat: 'NIGHTLIFE',  start: '8:00 PM',  end: null,       date: day(6),  area: 'P&L District',    emoji: '🌙', color: '#6366F1', max: 30, desc: 'Hit the best spots in the Power & Light District. Guided crawl with exclusive deals at each stop.' },
    { bizId: bizId1, title: 'Board Game Brunch',      cat: 'GAMES',      start: '11:00 AM', end: '2:00 PM',  date: day(8),  area: 'Midtown',         emoji: '🎲', color: '#8B5CF6', max: 24, desc: 'Bottomless mimosas + 50+ board games. Settlers, Codenames, Ticket to Ride, and more.' },
  ];

  const events = [];
  for (const e of eventData) {
    const event = await prisma.event.create({
      data: {
        businessId: e.bizId,
        title: e.title,
        description: e.desc,
        category: e.cat,
        startTime: e.start,
        endTime: e.end,
        date: e.date,
        maxSpots: e.max,
        area: e.area,
        emoji: e.emoji,
        color: e.color,
        status: 'ACTIVE',
        views: Math.floor(Math.random() * 200) + 10,
      },
    });
    events.push(event);
  }
  console.log(`  ✅ ${events.length} events created`);

  // ─── Event Chats + Attendees ─────────────────────────────
  let chatCount = 0;
  let attendeeCount = 0;
  let messageCount = 0;

  for (const event of events) {
    // Create event group chat
    const chat = await prisma.chat.create({
      data: {
        type: 'EVENT_GROUP',
        eventId: event.id,
        pinnedMessage: event.description || event.title,
        members: {
          create: [
            { businessId: event.businessId },
          ],
        },
      },
    });
    chatCount++;

    // Add 1-3 users as attendees + chat members
    const attendeeUsers = [userId1, userId2, userId3].slice(0, Math.floor(Math.random() * 3) + 1);
    for (const uid of attendeeUsers) {
      await prisma.eventAttendee.create({
        data: { eventId: event.id, userId: uid, status: 'JOINED' },
      });
      await prisma.chatMember.create({
        data: { chatId: chat.id, userId: uid },
      });
      attendeeCount++;
    }

    // Add a couple messages per chat
    const msgs = [
      { senderId: event.businessId, senderType: 'BUSINESS', content: `Welcome to ${event.title}! 🎉 Can\'t wait to see everyone there.` },
      { senderId: attendeeUsers[0], senderType: 'USER', content: 'Excited for this one! Should be a great time.' },
    ];
    if (attendeeUsers.length > 1) {
      msgs.push({ senderId: attendeeUsers[1], senderType: 'USER', content: 'Count me in! Bringing a friend too 🙌' });
    }

    for (const m of msgs) {
      await prisma.message.create({
        data: { chatId: chat.id, ...m },
      });
      messageCount++;
    }
  }
  console.log(`  ✅ ${chatCount} chats, ${attendeeCount} attendees, ${messageCount} messages`);

  // ─── Moments ─────────────────────────────────────────────
  const moments = await Promise.all([
    prisma.moment.create({
      data: {
        userId: userId1,
        content: 'Just left the best trivia night ever at Crossroads Social Club. Our team came in 2nd! 🧠🍻',
      },
    }),
    prisma.moment.create({
      data: {
        userId: userId2,
        content: 'Morning yoga in Loose Park is exactly what I needed. KC sunrises hit different 🌅',
      },
    }),
    prisma.moment.create({
      data: {
        userId: userId3,
        content: 'The taco situation on Southwest Blvd is unmatched. Fight me. 🌮🔥',
      },
    }),
    prisma.moment.create({
      data: {
        userId: userId1,
        content: 'Art Walk tonight! Who else is heading to Crossroads for First Friday?',
      },
    }),
  ]);

  // Add some likes and comments
  await prisma.momentLike.createMany({
    data: [
      { momentId: moments[0].id, userId: userId2 },
      { momentId: moments[0].id, userId: userId3 },
      { momentId: moments[1].id, userId: userId1 },
      { momentId: moments[2].id, userId: userId1 },
      { momentId: moments[2].id, userId: userId2 },
      { momentId: moments[3].id, userId: userId2 },
      { momentId: moments[3].id, userId: userId3 },
    ],
  });

  await prisma.momentComment.createMany({
    data: [
      { momentId: moments[0].id, userId: userId2, content: 'That was so fun! We need a rematch next week' },
      { momentId: moments[2].id, userId: userId1, content: 'El Pollo Rey for life 🐔' },
      { momentId: moments[3].id, userId: userId3, content: 'I\'ll be there! Let\'s meet up at 7?' },
    ],
  });
  console.log(`  ✅ ${moments.length} moments with likes & comments`);

  // ─── Reviews ─────────────────────────────────────────────
  const reviews = await Promise.all([
    prisma.review.create({ data: { businessId: bizId1, userId: userId1, rating: 5, content: 'Best trivia night in KC hands down. Staff is super friendly.' } }),
    prisma.review.create({ data: { businessId: bizId1, userId: userId2, rating: 4, content: 'Love the atmosphere. Wish they had more food options though.' } }),
    prisma.review.create({ data: { businessId: bizId2, userId: userId2, rating: 5, content: 'The bootcamp classes are no joke! Amazing trainers.' } }),
    prisma.review.create({ data: { businessId: bizId2, userId: userId3, rating: 4, content: 'Great outdoor workouts. The park yoga was very relaxing.' } }),
  ]);
  console.log(`  ✅ ${reviews.length} reviews`);

  // ─── Notifications ───────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: userId1, type: 'EVENT_REMINDER', title: 'Trivia Tuesday is tomorrow!', body: 'Don\'t forget — Trivia Tuesday at Crossroads Social Club starts at 7 PM.' },
      { userId: userId1, type: 'MOMENT_LIKE', title: 'Mia liked your moment', body: 'Mia Chen liked your post about trivia night.', data: { momentId: moments[0].id } },
      { userId: userId2, type: 'EVENT_JOINED', title: 'You joined Sunrise Bootcamp', body: 'See you at 6 AM sharp! Bring water and a mat.' },
      { userId: userId2, type: 'MOMENT_COMMENT', title: 'Jamal commented on your moment', body: 'I\'ll be there! Let\'s meet up at 7?', data: { momentId: moments[3].id } },
      { userId: userId3, type: 'CHAT_MESSAGE', title: 'New message in Sports Bar Watch Party', body: 'Let\'s gooo Chiefs! 🏈' },
    ],
  });
  console.log('  ✅ 5 notifications');

  // ─── DM between two users ───────────────────────────────
  const dm = await prisma.chat.create({
    data: {
      type: 'DM',
      members: {
        create: [
          { userId: userId1 },
          { userId: userId2 },
        ],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      { chatId: dm.id, senderId: userId1, senderType: 'USER', content: 'Hey! Are you going to the Art Walk this Friday?' },
      { chatId: dm.id, senderId: userId2, senderType: 'USER', content: 'Yes! I was just thinking about it. Want to go together?' },
      { chatId: dm.id, senderId: userId1, senderType: 'USER', content: 'Definitely! Let\'s meet at Crossroads at 7' },
    ],
  });
  console.log('  ✅ 1 DM conversation');

  console.log('\n🎉 Seed complete!\n');
  console.log('Test accounts (password: Test1234! for all):');
  console.log('  User (Admin): alex@test.com');
  console.log('  User:         mia@test.com');
  console.log('  User:         jamal@test.com');
  console.log('  Business:     crossroads@test.com (verified)');
  console.log('  Business:     westport@test.com (verified)');
  console.log('  Business:     rivermarket@test.com (pending)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
