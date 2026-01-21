
import sys
import os
import json

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from core.player import generate_initial_stats

def test_random_generation():
    print("--- Test 1: Random Generation Consistency ---")
    stats1 = generate_initial_stats("Guerreiro", "Humano", "Fantasia Medieval")
    stats2 = generate_initial_stats("Guerreiro", "Humano", "Fantasia Medieval")
    
    # Assert Attributes are populated
    assert "forca" in stats1["atributos"]
    
    # Assert randomness (highly likely to differ, but theoretically could match, lets just check structure)
    print(f"Stats 1 Gold: {stats1['inventario']['ouro']}")
    print(f"Stats 2 Gold: {stats2['inventario']['ouro']}")
    
    # Check Race Bonus (Human gets +1 in all from base, but base is randomized)
    # Hard to test exact values due to random base, but can check structure keys.
    print("Test 1 Passed: Structure Valid")

def test_magic_theme():
    print("\n--- Test 2: Magic Theme Allowed ---")
    stats = generate_initial_stats("Mago", "Elfo", "Alta Fantasia")
    magias = stats["magias"]
    print(f"Magias ({len(magias)}): {magias}")
    assert len(magias) > 0, "Mage in Fantasy should have spells"
    print("Test 2 Passed: Spells present")

def test_no_magic_theme():
    print("\n--- Test 3: No Magic Theme (Zombie) ---")
    stats = generate_initial_stats("Mago", "Humano", "Apocalipse Zumbi")
    magias = stats["magias"]
    print(f"Magias ({len(magias)}): {magias}")
    assert len(magias) == 0, "Mage in Zombie Apocalypse should NOT have spells"
    print("Test 3 Passed: Spells suppressed")

def test_class_stats():
    print("\n--- Test 4: Class Specifics (Rogue) ---")
    stats = generate_initial_stats("Ladino", "Halfling", "Cyberpunk")
    items = [i["item"] for i in stats["inventario"]["itens"]]
    print(f"Itens: {items}")
    assert "Kit de Ladino" in items
    assert stats["inventario"]["mana_maxima"] <= 20 # Should be capped low due to non-magic theme?
    print("Test 4 Passed: Rogue items present")

if __name__ == "__main__":
    try:
        test_random_generation()
        test_magic_theme()
        test_no_magic_theme()
        test_class_stats()
        print("\n[OK] All Tests Passed!")
    except AssertionError as e:
        print(f"\n[FAIL] Test Failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] value Error: {e}")
        sys.exit(1)
