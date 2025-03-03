import requests
from bs4 import BeautifulSoup
import json
import time

BASE_URL = "https://nc.tldb.info/db/items/page/{}"
VALID_TYPES = {
    'head', 'cloak', 'chest', 'hands', 'legs', 'feet',
    'spear', 'daggers', 'sword', 'greatsword', 'staff',
    'longbow', 'crossbows', 'wand', 'necklace', 
    'bracelet', 'ring', 'belt'
}

def get_item_data(row):
    try:
        item_type = row.select_one('td.text-center.fw-semsi-bold').text.strip().lower()
        if item_type not in VALID_TYPES:
            return None
            
        return {
            'name': row.select_one('td.ellipsis.svelte-d21jyt a').text.strip(),
            'type': item_type,
            'icon': row.select_one('td.item-icon-sticky img')['src'],
            'dkp_value': calculate_dkp(item_type)
        }
    except Exception as e:
        print(f"Error parsing row: {e}")
        return None

def calculate_dkp(item_type):
    dkp_map = {
        'weapon': 1000,
        'armor': 750,
        'accessory': 500
    }
    
    weapon_types = {'spear', 'daggers', 'sword', 'greatsword', 'staff', 'longbow', 'crossbows', 'wand'}
    
    if item_type in weapon_types:
        return dkp_map['weapon']
    elif item_type in {'head', 'cloak', 'chest', 'hands', 'legs', 'feet'}:
        return dkp_map['armor']
    else:
        return dkp_map['accessory']

def scrape_page(page):
    try:
        response = requests.get(BASE_URL.format(page), headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        rows = soup.select('#svelte main div.item-table table tbody tr')
        
        return [item for row in rows if (item := get_item_data(row))]
        
    except Exception as e:
        print(f"Error scraping page {page}: {e}")
        return []

# Main scraping process
all_items = []
page = 1
consecutive_empty = 0
MAX_EMPTY_PAGES = 15  # Stop after 15 empty pages in a row

print("Starting extended scraping with empty page tolerance...")
while consecutive_empty < MAX_EMPTY_PAGES:
    print(f"\nScraping page {page} (Consecutive empty pages: {consecutive_empty}/{MAX_EMPTY_PAGES})")
    items = scrape_page(page)
    
    if items:
        all_items.extend(items)
        print(f"✓ Found {len(items)} valid items (Total: {len(all_items)})")
        consecutive_empty = 0  # Reset counter on successful find
    else:
        print("× No valid items found")
        consecutive_empty += 1
        
    page += 1
    time.sleep(2)  # Always keep the delay

# Save results
with open('tnl_filtered_items.json', 'w') as f:
    json.dump(all_items, f, indent=2)

print(f"\nScraping completed with {len(all_items)} valid items")
print(f"Stopped after {consecutive_empty} consecutive empty pages")