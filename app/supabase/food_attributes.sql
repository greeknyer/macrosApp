-- Food attributes migration + seed for the macro planner.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- The app works without it (attributes are inferred), but running it makes the
-- attributes explicit and editable in the Foods form.

alter table foods
  add column if not exists form_role text,   -- protein | carb | fat | veg | condiment | dairy | fruit | other
  add column if not exists form text,        -- deli | grilled | roast | canned_fish | shellfish | fatty_fish | egg | patty | sausage | powder | bread | bagel | wrap | grain | potato | legume | cereal | rice_cake
  add column if not exists temp text,        -- cold | hot | any
  add column if not exists seafood boolean,
  add column if not exists fat_type text;    -- oil | butter | cheese | nut | nut_butter | sweet_spread | mayo | cream_cheese | avocado | dressing

-- Seed the current foods with the inferred attributes (edit any as needed):
update foods set form_role='carb', form='grain', temp='hot', seafood=false, fat_type=null where name='Brown Rice';
update foods set form_role='condiment', form=null, temp='any', seafood=false, fat_type=null where name='Heinz No Sugar Tomato Ketchup';
update foods set form_role='carb', form='potato', temp='hot', seafood=false, fat_type=null where name='Little Duos fresh Potatoes';
update foods set form_role='fruit', form=null, temp='cold', seafood=false, fat_type=null where name='Medium Banana';
update foods set form_role='veg', form=null, temp='any', seafood=false, fat_type=null where name='Mini peppers';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='nut' where name='Members Mark Unsalted Whole Cashews';
update foods set form_role='dairy', form=null, temp='cold', seafood=false, fat_type=null where name='0% Fat Free Cottage Cheese';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='cream_cheese' where name='1/3 Less Fat Fat Cream Cheese';
update foods set form_role='protein', form='sausage', temp='hot', seafood=false, fat_type=null where name='Aidells Chicken & Apple Sausage';
update foods set form_role='carb', form='grain', temp='hot', seafood=false, fat_type=null where name='Barilla Protein Pasta Angel Hair';
update foods set form_role='fruit', form=null, temp='cold', seafood=false, fat_type=null where name='Blueberries';
update foods set form_role='dairy', form=null, temp='cold', seafood=false, fat_type=null where name='Dannon Oikos Triple Zero Yogurt';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='dressing' where name='G Hugues Dressing';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='avocado' where name='Go Verden Avocado Cup';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='cheese' where name='Great Value Par Skim Shredded Mozzarella';
update foods set form_role='protein', form='deli', temp='cold', seafood=false, fat_type=null where name='Great Value Thinly Sliced Turkey';
update foods set form_role='veg', form=null, temp='any', seafood=false, fat_type=null where name='House Salad';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='mayo' where name='Light Mayonnaise';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='nut_butter' where name='Members Mark Creamy Peanut Butter';
update foods set form_role='carb', form='cereal', temp='any', seafood=false, fat_type=null where name='Nature Valley Protein Granola';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='sweet_spread' where name='Nutella';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='oil' where name='Olive Oil or Butter';
update foods set form_role='carb', form='rice_cake', temp='any', seafood=false, fat_type=null where name='Plain Rice Cake';
update foods set form_role='carb', form='cereal', temp='any', seafood=false, fat_type=null where name='Power Cakes';
update foods set form_role='carb', form='cereal', temp='any', seafood=false, fat_type=null where name='Quaker 1-Minute Oats';
update foods set form_role='carb', form='bread', temp='any', seafood=false, fat_type=null where name='Sara Lee Delightful Wheat Bread';
update foods set form_role='fat', form=null, temp='any', seafood=false, fat_type='cheese' where name='Sargento Ultra Thin Cheese';
update foods set form_role='dairy', form=null, temp='cold', seafood=false, fat_type=null where name='Silk Unsweetened Almond Milk';
update foods set form_role='carb', form='grain', temp='hot', seafood=false, fat_type=null where name='Simply Nature QUINOA';
update foods set form_role='other', form=null, temp='any', seafood=false, fat_type=null where name='simplyFUEL Chocolate Chip Cookie Dough Protein Balls';
update foods set form_role='carb', form='bagel', temp='any', seafood=false, fat_type=null where name='Sola Bagel';
update foods set form_role='protein', form='powder', temp='any', seafood=false, fat_type=null where name='Transparent Labs Whey Isolate';
update foods set form_role='carb', form='wrap', temp='any', seafood=false, fat_type=null where name='XTREME Protein Plus Protein Fit Wraps';
update foods set form_role='protein', form='canned_fish', temp='cold', seafood=true, fat_type=null where name='Canned Tuna in Water';
update foods set form_role='protein', form='deli', temp='cold', seafood=false, fat_type=null where name='Great Value 99% Fat Free Thinly Sliced Rotisserie Chicken';
update foods set form_role='protein', form='roast', temp='hot', seafood=false, fat_type=null where name='Great Value Rotisserie Seasoned Chicken Breast';
update foods set form_role='protein', form='grilled', temp='hot', seafood=false, fat_type=null where name='Grilled Chicken Breast';
update foods set form_role='protein', form='shellfish', temp='any', seafood=true, fat_type=null where name='Member''s Mark Farm Raised Jumbo Cooked Shrimp';
update foods set form_role='protein', form='grilled', temp='hot', seafood=false, fat_type=null where name='Member''s Mark Mesquite Grilled Chicken Fillets';
update foods set form_role='protein', form='fatty_fish', temp='hot', seafood=true, fat_type=null where name='Member''s Mark Skinless and Boneless Atlantic Salmon';
update foods set form_role='protein', form='patty', temp='hot', seafood=false, fat_type=null where name='Members Mark Four Pepper Chicken Burger';
update foods set form_role='protein', form='patty', temp='hot', seafood=true, fat_type=null where name='Safe Catch Tuna Burgers';
update foods set form_role='protein', form='egg', temp='hot', seafood=false, fat_type=null where name='Scrambled Eggs (2 Whole + 56g Whites)';
update foods set form_role='protein', form='canned_fish', temp='cold', seafood=true, fat_type=null where name='Starkist Solid White Albacore Canned Tuna (Drained)';
