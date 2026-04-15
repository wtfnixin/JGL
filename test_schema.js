require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
    const { data: votes, error } = await supabase.from('votes').select('*').limit(2);
    if (error) {
        console.error("Error fetching votes:", error);
    } else {
        console.log("Votes data:", votes);
    }
})();
