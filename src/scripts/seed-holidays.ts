import { addHoliday, connectDB } from '../config/db.js';

const holidays = [
  { date: new Date('2025-01-14'), description: 'Magh Bihu & Tusu Puja' },
  { date: new Date('2025-01-15'), description: 'Holiday continuation' },
  { date: new Date('2025-01-23'), description: 'Netaji\'s Birthday' },
  { date: new Date('2025-01-26'), description: 'Republic Day' },
  { date: new Date('2025-01-28'), description: 'Gwthar Bathou San' },
  { date: new Date('2025-01-31'), description: 'Me-Dam-Me-Phi' },
  { date: new Date('2025-02-12'), description: 'Bir Chilaray Divas' },
  { date: new Date('2025-03-14'), description: 'Dol Jatra' },
  { date: new Date('2025-03-31'), description: 'Id-Ul-Fitre' },
  { date: new Date('2025-04-14'), description: 'Bohag Bihu' },
  { date: new Date('2025-04-15'), description: 'Bohag Bihu continuation' },
  { date: new Date('2025-04-16'), description: 'Bohag Bihu continuation' },
  { date: new Date('2025-04-18'), description: 'Good Friday' },
  { date: new Date('2025-04-21'), description: 'Sati Sadhani Divas' },
  { date: new Date('2025-04-28'), description: 'Tithi of Damodar Dev' },
  { date: new Date('2025-05-01'), description: 'May Day' },
  { date: new Date('2025-05-12'), description: 'Buddha Purnima' },
  { date: new Date('2025-06-07'), description: 'Id-ul-Zuha' },
  { date: new Date('2025-06-12'), description: 'Janmotsav of Sri Sri Madhabdeva' },
  { date: new Date('2025-08-15'), description: 'Independence Day' },
  { date: new Date('2025-08-25'), description: 'Tirubhav Tithi of Srimanta Sankardeva' },
  { date: new Date('2025-09-03'), description: 'Karam Puja' },
  { date: new Date('2025-09-12'), description: 'Tirubhav Tithi of Sri Sri Madhabdeva' },
  { date: new Date('2025-09-14'), description: 'Janmastomi' },
  { date: new Date('2025-09-29'), description: 'Durga Puja' },
  { date: new Date('2025-09-30'), description: 'Durga Puja continuation' },
  { date: new Date('2025-10-01'), description: 'Durga Puja continuation' },
  { date: new Date('2025-10-02'), description: 'Vijoya Dashomi / Janmotsav of Sri Sri Sankardeva / Mahatma Gandhi\'s Birthday' },
  { date: new Date('2025-10-18'), description: 'Kati Bihu' },
  { date: new Date('2025-10-20'), description: 'Kali Puja & Diwali' },
  { date: new Date('2025-10-23'), description: 'Bhatri Dwitiya' },
  { date: new Date('2025-10-28'), description: 'Chhat Puja' },
  { date: new Date('2025-11-05'), description: 'Guru Nanak\'s Birthday' },
  { date: new Date('2025-11-24'), description: 'Lachit Divas' },
  { date: new Date('2025-12-02'), description: 'Asom Divas (Su-ka-Pha Divas)' },
  { date: new Date('2025-12-25'), description: 'Christmas' },
];

const seedHolidays = async () => {
  try {
    console.log('🎉 Adding Indian holidays for 2025...');
    
    
    await connectDB();
    
    let successCount = 0;
    let errorCount = 0;

    for (const holiday of holidays) {
      try {
        const result = await addHoliday(holiday.date, holiday.description);
        if (result.success) {
          console.log(`✅ ${result.message}`);
          successCount++;
        } else {
          console.log(`❌ Failed to add ${holiday.description}: ${result.message}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error adding ${holiday.description}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary: ${successCount} holidays added, ${errorCount} errors`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to seed holidays:', error);
    process.exit(1);
  }
};

seedHolidays();