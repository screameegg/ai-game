extends SceneTree

func _initialize() -> void:
	var err := OK
	var packed: PackedScene = load("res://scenes/main.tscn")
	if packed == null:
		push_error("FAIL: main.tscn load")
		quit(1)
		return
	var main: Node = packed.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	var player := main.get_node_or_null("Actors/Player")
	var follower := main.get_node_or_null("Actors/Follower")
	var ball := main.get_node_or_null("Actors/RedBall")
	var water := main.get_node_or_null("Water/WaterArea")
	if player == null or follower == null or ball == null or water == null:
		push_error("FAIL: missing nodes player=%s follower=%s ball=%s water=%s" % [player, follower, ball, water])
		quit(1)
		return
	print("SMOKE_OK player=", player.position, " ball=", ball.position)
	quit(0)
