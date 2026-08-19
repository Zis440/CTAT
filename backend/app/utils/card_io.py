
def select_cards():
    """
    Interactive card selection for single or multi-card analysis.

    Returns:
        tuple: (mode, selected_cards, stories)
            - mode: 'single' or 'multi'
            - selected_cards: list of card IDs
            - stories: dict mapping card_id -> story_text
    """
    print("\n" + "="*80)
    print("CARD SELECTION")
    print("="*80 + "\n")

    available_cards = [
        "Card_1", "Card_2", "Card_3", "Card_4", "Card_5",
        "Card_6", "Card_7", "Card_8", "Card_9", "Card_10",
        "Card_11", "Card_12", "Card_13"
    ]

    print("Available TAT Cards:")
    for i, card in enumerate(available_cards, 1):
        if i % 5 == 0:
            print(f"  {card}")
        else:
            print(f"  {card}", end="")
    print("\n")

    print("Analysis Mode:")
    print("  1. Single-card analysis (traditional)")
    print("  2. Multi-card analysis (comprehensive psychological profile)")

    mode_input = input("\nSelect mode (1/2): ").strip()

    selected_cards = []
    stories = {}

    if mode_input == "1":
        mode = "single"
        print("\n" + "-"*80)
        print("SINGLE-CARD MODE")
        print("-"*80)

        card_id = input("\nEnter card ID (e.g., Card_1, Card_2): ").strip()

        if card_id not in available_cards:
            print(f"\n⚠️ Card '{card_id}' not in standard set. Proceeding anyway...")

        selected_cards = [card_id]
        print(f"\n✅ Selected: {card_id}")

    elif mode_input == "2":
        mode = "multi"
        print("\n" + "-"*80)
        print("MULTI-CARD MODE")
        print("-"*80)

        while True:
            try:
                num_cards = int(input("\nHow many cards? (2-10 recommended): ").strip())
                if 2 <= num_cards <= 20:
                    break
                else:
                    print("⚠️ Please select between 2 and 20 cards")
            except ValueError:
                print("⚠️ Please enter a valid number")

        print(f"\nSelect {num_cards} cards (enter card IDs one at a time):")

        for i in range(num_cards):
            while True:
                card_id = input(f"\nCard {i+1}/{num_cards}: ").strip()

                if card_id in selected_cards:
                    print(f"⚠️ '{card_id}' already selected. Choose a different card.")
                    continue

                if card_id not in available_cards:
                    confirm = input(f"⚠️ '{card_id}' not in standard set. Use anyway? (y/n): ")
                    if confirm.lower() != 'y':
                        continue

                selected_cards.append(card_id)
                print(f"✅ Added: {card_id}")
                break

        print(f"\n✅ Selected {len(selected_cards)} cards: {', '.join(selected_cards)}")

    else:
        print("\n⚠️ Invalid mode. Defaulting to single-card.")
        mode = "single"
        card_id = input("Enter card ID: ").strip()
        selected_cards = [card_id]

    print("\n" + "="*80)
    print("STORY COLLECTION")
    print("="*80)

    for card_id in selected_cards:
        print(f"\n{'-'*80}")
        print(f"Card: {card_id}")
        print(f"{'-'*80}")
        print("\nInstructions: Tell a story about what is happening in the picture.")
        print("Include:")
        print("- What is happening now?")
        print("- What led up to this?")
        print("- What are the characters thinking and feeling?")
        print("- How will it turn out?")
        print("\nEnter story (press Enter twice when done):")
        print()

        story_lines = []
        empty_line_count = 0

        while empty_line_count < 2:
            line = input()
            if line.strip() == "":
                empty_line_count += 1
            else:
                empty_line_count = 0
                story_lines.append(line)

        story = "\n".join(story_lines).strip()

        if len(story) < 20:
            print("\n⚠️ Story seems very short. Consider providing more detail.")
            confirm = input("Continue with this story? (y/n): ")
            if confirm.lower() != 'y':
                print("Please re-enter the story:")
                story = input().strip()

        stories[card_id] = story
        print(f"\n✅ Story recorded for {card_id} ({len(story)} characters)")

    print("\n" + "="*80)
    print(f"SELECTION COMPLETE: {mode.upper()} MODE")
    print(f"Cards: {', '.join(selected_cards)}")
    print("="*80)

    return mode, selected_cards, stories
