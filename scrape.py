import requests
from bs4 import BeautifulSoup
import json
import time

BASE_URL = "https://tldb.info/db/items/page/{}"
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
            'dkp_value': calculate_dkp(item_type)  # Custom DKP calculation
        }
    except Exception as e:
        print(f"Error parsing row: {e}")
        return None

def calculate_dkp(item_type):
    # Customize DKP values based on your guild's needs
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
MAX_PAGES = 20  # Safety limit

while page <= MAX_PAGES:
    print(f"Scraping page {page}...")
    items = scrape_page(page)
    
    if not items:
        break
        
    all_items.extend(items)
    page += 1
    time.sleep(2)  # Respectful delay

# Save results
with open('tnl_filtered_items.json', 'w') as f:
    json.dump(all_items, f, indent=2)

print(f"Scraped {len(all_items)} valid items")