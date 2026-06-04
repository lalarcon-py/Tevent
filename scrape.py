import requests
from bs4 import BeautifulSoup
import json
import time
import re
import concurrent.futures

# Configuration
BASE_URL = "https://tldb.info/db/items/page/{}"
VALID_TYPES = {
    'head', 'cloak', 'chest', 'Hands', 'legs', 'Feet',
    'spear', 'daggers', 'Sword', 'GreatSword', 'Staff',
    'longbow', 'crossbows', 'Wand', 'Necklace', 
    'Bracelet', 'Ring', 'Belt'
}

# Use cache to avoid redundant downloads
item_cache = {}

def get_item_traits(url):
    """Extract only the traits that appear after 'Possible Traits [Max 3]'"""
    try:
        if url in item_cache:
            return item_cache[url]
            
        print(f"  Fetching traits from {url}")
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        
        content = response.text
        
        # Checking for "Possible Traits [Max 3]" section and extracting traits from it
        possible_traits_pattern = r'Possible Traits \[Max \d+\](.*?)(?:<\/div>|<div class=|$)'
        trait_section_match = re.search(possible_traits_pattern, content, re.DOTALL)
        
        traits = []
        if trait_section_match:
            trait_section = trait_section_match.group(1)
            
            # Extract trait names
            trait_name_pattern = r'([A-Za-z][\w\s-]+):'
            trait_names = re.findall(trait_name_pattern, trait_section)
            
            # Strip out annoying non-trait attributes present in destination page
            non_traits = [
                'font-size', 'font-weight', 'color', 'class', 'style', 
                'width', 'height', 'margin', 'padding', 'src', 'alt',
                'opacity', 'display', 'position', 'top', 'left', 'right',
                'bottom', 'background', 'border', 'text-align', 'line-height'
            ]
            
            # Trait name formatting and filtering
            for name in trait_names:
                trait_name = name.strip()
                # Skip if trait name is empty or matches any non-trait
                if not trait_name or any(trait_name.lower() == nt for nt in non_traits):
                    continue
                traits.append(f"{trait_name}:")
        
        # Cache results
        item_cache[url] = traits
        
        print(f"  Found {len(traits)} traits: {traits}")
        return traits
        
    except Exception as e:
        print(f"  Error fetching traits for {url}: {e}")
        return []

def calculate_dkp(item_type):
    """Calculate DKP value based on item type"""
    weapon_types = {'spear', 'daggers', 'Sword', 'GreatSword', 'Staff', 'longbow', 'crossbows', 'Wand'}
    armor_types = {'head', 'cloak', 'chest', 'Hands', 'legs', 'Feet'}
    
    if item_type in weapon_types:
        return 1000  # Weapon
    elif item_type in armor_types:
        return 750   # Armor
    else:
        return 500   # Accessory

def process_item(row):
    # Extract relevant data
    try:
        # Get item type
        type_cell = row.select_one('td.text-center.fw-semsi-bold')
        if not type_cell:
            return None
            
        item_type = type_cell.text.strip().lower()
        if item_type not in VALID_TYPES:
            return None
        
        item_link = row.select_one('td.ellipsis.svelte-d21jyt a')
        if not item_link:
            return None
            
        item_name = item_link.text.strip()
        
        item_url = item_link.get('href')
        if not item_url:
            return None
            
        # Make an abolute URL if it's relative
        if not item_url.startswith('http'):
            item_url = f"https://tldb.info{item_url}" if item_url.startswith('/') else f"https://tldb.info/{item_url}"
        
        # item icon element
        icon_element = row.select_one('td.item-icon-sticky img')
        icon_url = icon_element['src'] if icon_element else ""
        
        # Item dictionary
        item_data = {
            'name': item_name,
            'type': item_type,
            'icon': icon_url,
            'dkp_value': calculate_dkp(item_type),
            'traits': get_item_traits(item_url)
        }
        
        return item_data
        
    except Exception as e:
        print(f"Error processing item: {e}")
        return None

def scrape_page(page):
    try:
        print(f"Scraping page {page}...")
        response = requests.get(BASE_URL.format(page), headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        rows = soup.select('#svelte main div.item-table table tbody tr')
        
        if not rows:
            print(f"No item rows found on page {page}")
            return []
        
        # Process items in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            # Submit all tasks
            future_to_row = {executor.submit(process_item, row): row for row in rows}
            
            # Collect results as they complete
            results = []
            for future in concurrent.futures.as_completed(future_to_row):
                item = future.result()
                if item:
                    results.append(item)
        
        return results
        
    except Exception as e:
        print(f"Error scraping page {page}: {e}")
        return []

def main():
    all_items = []
    page = 1
    consecutive_empty = 0
    MAX_EMPTY_PAGES = 15  # Max number of pages to scrape without finding new items before stopping

    print("Starting TLDb item scraping...")
    while consecutive_empty < MAX_EMPTY_PAGES:
        print(f"\nScraping page {page} (Consecutive empty pages: {consecutive_empty}/{MAX_EMPTY_PAGES})")
        items = scrape_page(page)
        
        if items:
            all_items.extend(items)
            print(f"✓ Found {len(items)} valid items (Total: {len(all_items)})")
            consecutive_empty = 0
        else:
            print("× No valid items found")
            consecutive_empty += 1
            
        page += 1
        time.sleep(1.5)  # Be nice to the server (pls don't rate limit me)
    
    print(f"\nSaving {len(all_items)} items to tldb_items.json")
    with open('tldb_items.json', 'w') as f:
        json.dump(all_items, f, indent=2)
    
    print("Scraping completed!")

if __name__ == "__main__":
    main()