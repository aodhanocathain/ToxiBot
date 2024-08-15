#pragma once

template<typename T, int size>
class StackContainer {
public:
	StackContainer() : nextFreeIndex(0) 
	{}

	StackContainer& operator=(StackContainer& s) {
		int length = s.getNextFreeIndex();
		this->nextFreeIndex = length;
		for (int i = 0; i < length; i++) {
			(*this)[i] = s[i];
		}
		return *this;
	}

	T& operator[](int index) {
		return this->data[index];
	}
	void push(T item) {
		this->data[this->nextFreeIndex] = item;
		this->nextFreeIndex++;
	}
	T pop() {
		T last = this->last();
		this->nextFreeIndex--;
		return last;
	}
	T& last() {
		return this->data[this->nextFreeIndex - 1];
	}

	int getNextFreeIndex() {
		return this->nextFreeIndex;
	}

	void reset() {
		this->nextFreeIndex = 0;
	}

private:
	T data[size];
	int nextFreeIndex;
};