require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
    const { data, error } = await supabase.from('teams').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Team schema keys:", Object.keys(data[0] || {}));
    }
})();
