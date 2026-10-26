extends CharacterBody2D

@export var follow_distance: float = 28.0
@export var speed: float = 100.0
@export var lag: float = 0.12

var target: Node2D
var _smooth: Vector2
var _frames: Dictionary = {}
var facing: String = "s"

func set_follow_target(t: Node2D) -> void:
	target = t
	_smooth = global_position

func _ready() -> void:
	_smooth = global_position
	_frames = {
		"s": load("res://art/slime_s.png"),
		"w": load("res://art/slime_w.png"),
		"e": load("res://art/slime_e.png"),
		"n": load("res://art/slime_n.png"),
	}

func _physics_process(delta: float) -> void:
	if target == null:
		return
	var desired: Vector2 = target.global_position - Vector2(0, 8)
	var to := desired - global_position
	if to.length() > follow_distance:
		var dest := desired - to.normalized() * follow_distance
		_smooth = _smooth.lerp(dest, 1.0 - exp(-delta / max(lag, 0.001)))
		var step := _smooth - global_position
		if step.length() > 0.5:
			velocity = step.normalized() * min(speed, step.length() / delta)
			if abs(step.x) > abs(step.y):
				facing = "e" if step.x > 0 else "w"
			else:
				facing = "s" if step.y > 0 else "n"
			_apply_frame()
		else:
			velocity = Vector2.ZERO
	else:
		velocity = Vector2.ZERO
		_smooth = global_position
	move_and_slide()

func _apply_frame() -> void:
	var spr: Sprite2D = null
	for c in get_children():
		if c is Sprite2D:
			spr = c
			break
	if spr == null or not _frames.has(facing):
		return
	var tex: Texture2D = _frames[facing]
	spr.texture = tex
	spr.offset = Vector2(0, -tex.get_height() / 2.0)
