extends Area2D

func _ready() -> void:
	body_entered.connect(_on_enter)
	body_exited.connect(_on_exit)

func _on_enter(body: Node2D) -> void:
	if body.has_method("set_in_water"):
		body.set_in_water(true)

func _on_exit(body: Node2D) -> void:
	if body.has_method("set_in_water"):
		body.set_in_water(false)
